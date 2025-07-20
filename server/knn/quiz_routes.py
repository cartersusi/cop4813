# server/quiz/quiz_routes.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os

from server.db.db import DatabaseManager

# Create router
quiz_router = APIRouter(prefix="/api/quiz", tags=["quiz"])
security = HTTPBearer()

# Pydantic models
class QuizResultsRequest(BaseModel):
    extraversion: float
    agreeableness: float
    conscientiousness: float
    emotional_stability: float
    intellect_imagination: float
    test_version: str = "1.0"

class QuizResultsResponse(BaseModel):
    success: bool
    message: str
    result_id: Optional[int] = None

class UserQuizResultsResponse(BaseModel):
    success: bool
    results: Optional[dict] = None
    message: Optional[str] = None

# Database dependency
def get_db():
    db = DatabaseManager(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "friend_finder"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    try:
        yield db
    finally:
        db.disconnect()

# Dependency to verify user session
async def verify_user_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that the user has a valid session"""
    try:
        db = DatabaseManager()
        session_data = db.verify_session(credentials.credentials)
        
        if not session_data:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Get user data
        cursor = db.execute_query("""
            SELECT u.* FROM users u
            WHERE u.id = %s AND u.is_active = TRUE AND u.is_deleted = FALSE
        """, (session_data['user_id'],))
        
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        return dict(user_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")

@quiz_router.post("/save-results", response_model=QuizResultsResponse)
async def save_quiz_results(
    results: QuizResultsRequest,
    user_data: dict = Depends(verify_user_session)
):
    """Save quiz results for authenticated user"""
    try:
        db = DatabaseManager()
        
        # Validate scores (should be between 0 and 100)
        scores = [
            results.extraversion,
            results.agreeableness, 
            results.conscientiousness,
            results.emotional_stability,
            results.intellect_imagination
        ]
        
        if not all(0 <= score <= 100 for score in scores):
            raise HTTPException(status_code=400, detail="All personality scores must be between 0 and 100")
        
        user_id = user_data['id']
        
        # Start transaction
        db.connection.autocommit = False
        
        try:
            # Mark any existing results as not current
            db.execute_query("""
                UPDATE results 
                SET is_current = FALSE 
                WHERE user_id = %s
            """, (user_id,))
            
            # Insert new results
            cursor = db.execute_query("""
                INSERT INTO results (
                    user_id, extraversion, agreeableness, conscientiousness,
                    emotional_stability, intellect_imagination, test_version, 
                    is_current, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                user_id,
                results.extraversion,
                results.agreeableness,
                results.conscientiousness,
                results.emotional_stability,
                results.intellect_imagination,
                results.test_version
            ))
            
            result = cursor.fetchone()
            result_id = result['id']
            
            # Update user's current_results reference
            db.execute_query("""
                UPDATE users 
                SET current_results = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (result_id, user_id))
            
            # Commit transaction
            db.connection.commit()
            
            # Log the event
            try:
                db.log_security_event(
                    user_id=user_id,
                    event_type="quiz_completed",
                    success=True,
                    metadata={
                        "result_id": result_id,
                        "test_version": results.test_version,
                        "scores": {
                            "extraversion": results.extraversion,
                            "agreeableness": results.agreeableness,
                            "conscientiousness": results.conscientiousness,
                            "emotional_stability": results.emotional_stability,
                            "intellect_imagination": results.intellect_imagination
                        }
                    }
                )
            except Exception as log_error:
                print(f"Warning: Could not log quiz completion event: {log_error}")
            
            return QuizResultsResponse(
                success=True,
                message="Quiz results saved successfully",
                result_id=result_id
            )
            
        except Exception as e:
            # Rollback transaction on error
            db.connection.rollback()
            raise e
        finally:
            # Restore autocommit
            db.connection.autocommit = True
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving quiz results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save quiz results: {str(e)}")

@quiz_router.get("/my-results", response_model=UserQuizResultsResponse)
async def get_user_quiz_results(
    user_data: dict = Depends(verify_user_session)
):
    """Get current quiz results for authenticated user"""
    try:
        db = DatabaseManager()
        user_id = user_data['id']
        
        # Get user's current results
        cursor = db.execute_query("""
            SELECT r.* FROM results r
            WHERE r.user_id = %s AND r.is_current = TRUE
            ORDER BY r.created_at DESC
            LIMIT 1
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            return UserQuizResultsResponse(
                success=True,
                results=None,
                message="No quiz results found"
            )
        
        # Format the results
        results_data = {
            "id": result['id'],
            "extraversion": float(result['extraversion']),
            "agreeableness": float(result['agreeableness']),
            "conscientiousness": float(result['conscientiousness']),
            "emotional_stability": float(result['emotional_stability']),
            "intellect_imagination": float(result['intellect_imagination']),
            "test_version": result['test_version'],
            "created_at": result['created_at'].isoformat() if result['created_at'] else None
        }
        
        return UserQuizResultsResponse(
            success=True,
            results=results_data,
            message="Results retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving quiz results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve quiz results: {str(e)}")

@quiz_router.get("/history")
async def get_quiz_history(
    user_data: dict = Depends(verify_user_session)
):
    """Get quiz history for authenticated user"""
    try:
        db = DatabaseManager()
        user_id = user_data['id']
        
        # Get all quiz results for user, ordered by date
        cursor = db.execute_query("""
            SELECT r.* FROM results r
            WHERE r.user_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))
        
        results = cursor.fetchall()
        
        # Format the results
        history = []
        for result in results:
            history.append({
                "id": result['id'],
                "extraversion": float(result['extraversion']),
                "agreeableness": float(result['agreeableness']),
                "conscientiousness": float(result['conscientiousness']),
                "emotional_stability": float(result['emotional_stability']),
                "intellect_imagination": float(result['intellect_imagination']),
                "test_version": result['test_version'],
                "is_current": result['is_current'],
                "created_at": result['created_at'].isoformat() if result['created_at'] else None
            })
        
        return {
            "success": True,
            "history": history,
            "total_tests": len(history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving quiz history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve quiz history: {str(e)}")

@quiz_router.delete("/results/{result_id}")
async def delete_quiz_result(
    result_id: int,
    user_data: dict = Depends(verify_user_session)
):
    """Delete a specific quiz result (only if user owns it)"""
    try:
        db = DatabaseManager()
        user_id = user_data['id']
        
        # Check if the result belongs to the user
        cursor = db.execute_query("""
            SELECT id, is_current FROM results 
            WHERE id = %s AND user_id = %s
        """, (result_id, user_id))
        
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Quiz result not found or access denied")
        
        # Don't allow deletion of current result if it's the only one
        if result['is_current']:
            cursor = db.execute_query("""
                SELECT COUNT(*) as count FROM results WHERE user_id = %s
            """, (user_id,))
            
            count_result = cursor.fetchone()
            if count_result['count'] == 1:
                raise HTTPException(status_code=400, detail="Cannot delete your only quiz result")
        
        # Delete the result
        db.execute_query("DELETE FROM results WHERE id = %s", (result_id,))
        
        # If we deleted the current result, make the most recent one current
        if result['is_current']:
            cursor = db.execute_query("""
                SELECT id FROM results 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (user_id,))
            
            latest_result = cursor.fetchone()
            if latest_result:
                db.execute_query("""
                    UPDATE results SET is_current = TRUE WHERE id = %s
                """, (latest_result['id'],))
                
                # Update user's current_results reference
                db.execute_query("""
                    UPDATE users SET current_results = %s WHERE id = %s
                """, (latest_result['id'], user_id))
        
        return {"success": True, "message": "Quiz result deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting quiz result: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete quiz result: {str(e)}")

# Optional: Endpoint to get quiz statistics
@quiz_router.get("/stats")
async def get_quiz_stats(
    user_data: dict = Depends(verify_user_session)
):
    """Get quiz statistics for authenticated user"""
    try:
        db = DatabaseManager()
        user_id = user_data['id']
        
        # Get basic stats
        cursor = db.execute_query("""
            SELECT 
                COUNT(*) as total_tests,
                MIN(created_at) as first_test,
                MAX(created_at) as latest_test,
                AVG(extraversion) as avg_extraversion,
                AVG(agreeableness) as avg_agreeableness,
                AVG(conscientiousness) as avg_conscientiousness,
                AVG(emotional_stability) as avg_emotional_stability,
                AVG(intellect_imagination) as avg_intellect_imagination
            FROM results 
            WHERE user_id = %s
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        if not stats or stats['total_tests'] == 0:
            return {
                "success": True,
                "stats": {
                    "total_tests": 0,
                    "first_test": None,
                    "latest_test": None,
                    "averages": None
                }
            }
        
        return {
            "success": True,
            "stats": {
                "total_tests": stats['total_tests'],
                "first_test": stats['first_test'].isoformat() if stats['first_test'] else None,
                "latest_test": stats['latest_test'].isoformat() if stats['latest_test'] else None,
                "averages": {
                    "extraversion": round(float(stats['avg_extraversion']), 1),
                    "agreeableness": round(float(stats['avg_agreeableness']), 1),
                    "conscientiousness": round(float(stats['avg_conscientiousness']), 1),
                    "emotional_stability": round(float(stats['avg_emotional_stability']), 1),
                    "intellect_imagination": round(float(stats['avg_intellect_imagination']), 1)
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving quiz stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve quiz stats: {str(e)}")