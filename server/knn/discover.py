# server/discover/discover_routes.py

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import numpy as np

from server.db.db import DatabaseManager
from server.knn.knn import KNearestNeighbors

# Create router
discover_router = APIRouter(prefix="/api/discover", tags=["discover"])
security = HTTPBearer()

# Pydantic models
class PersonalityResults(BaseModel):
    extraversion: float
    agreeableness: float
    conscientiousness: float
    emotional_stability: float
    intellect_imagination: float

class CompatibleUser(BaseModel):
    id: int
    username: str
    first_name: Optional[str]
    last_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    personality_results: PersonalityResults
    compatibility_score: float
    distance: float
    friend_status: str
    mutual_friends: int

class DiscoverResponse(BaseModel):
    users: List[CompatibleUser]
    total_count: int
    page: int
    limit: int
    has_more: bool

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from session"""
    try:
        db = DatabaseManager()
        session_data = db.verify_session(credentials.credentials)
        
        if not session_data:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        return session_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

def calculate_compatibility_score(user_results: np.ndarray, other_results: np.ndarray) -> float:
    """
    Calculate compatibility score between two personality profiles.
    Uses a combination of similarity and complementarity.
    """
    # Calculate Euclidean distance (lower is more similar)
    distance = np.sqrt(np.sum((user_results - other_results) ** 2))
    
    # Convert distance to similarity score (0-100%)
    # Assuming max possible distance is sqrt(5 * 100^2) = ~223.6
    max_distance = np.sqrt(5 * 100**2)
    similarity = max(0, 100 - (distance / max_distance * 100))
    
    # Add complementarity bonus for traits that complement each other
    # For example, high extraversion with moderate agreeableness
    complementarity_bonus = 0
    
    # Extraversion-Agreeableness complementarity
    if user_results[0] > 70 and 40 <= other_results[1] <= 80:  # High extraversion with moderate agreeableness
        complementarity_bonus += 5
    
    # Conscientiousness complementarity (both high is good)
    if user_results[2] > 60 and other_results[2] > 60:
        complementarity_bonus += 5
    
    # Emotional stability (both having reasonable levels is good)
    if user_results[3] > 50 and other_results[3] > 50:
        complementarity_bonus += 5
    
    # Intellect/Imagination (some variety can be good)
    intellect_diff = abs(user_results[4] - other_results[4])
    if 10 <= intellect_diff <= 30:  # Some difference but not too much
        complementarity_bonus += 3
    
    final_score = min(100, similarity + complementarity_bonus)
    return round(final_score, 1)

@discover_router.get("/compatible-users", response_model=DiscoverResponse)
async def get_compatible_users(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    age_range: Optional[str] = None,
    location: Optional[str] = None,
    min_compatibility: Optional[str] = None,
    interests: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get compatible users using KNN algorithm"""
    try:
        db = DatabaseManager()
        user_id = current_user['user_id']
        
        # Get current user's personality results
        cursor = db.execute_query("""
            SELECT extraversion, agreeableness, conscientiousness, 
                   emotional_stability, intellect_imagination
            FROM results 
            WHERE user_id = %s AND is_current = TRUE
        """, (user_id,))
        
        user_results = cursor.fetchone()
        if not user_results:
            raise HTTPException(status_code=400, detail="You need to complete the personality assessment first")
        
        # Convert to numpy array for KNN
        user_vector = np.array([
            user_results['extraversion'],
            user_results['agreeableness'], 
            user_results['conscientiousness'],
            user_results['emotional_stability'],
            user_results['intellect_imagination']
        ])
        
        # Build query for other users with personality results
        base_conditions = [
            "u.id != %s",  # Exclude current user
            "u.is_active = TRUE",
            "u.is_deleted = FALSE",
            "r.is_current = TRUE"
        ]
        base_params = [user_id]
        
        # Add search filter
        if search:
            base_conditions.append("""
                (u.username ILIKE %s OR u.first_name ILIKE %s 
                 OR u.last_name ILIKE %s OR u.bio ILIKE %s)
            """)
            search_param = f"%{search}%"
            base_params.extend([search_param, search_param, search_param, search_param])
        
        # Add age range filter (approximate based on created_at)
        if age_range and age_range != "all":
            if age_range == "18-25":
                base_conditions.append("u.created_at >= NOW() - INTERVAL '7 years'")
            elif age_range == "26-35":
                base_conditions.append("u.created_at BETWEEN NOW() - INTERVAL '15 years' AND NOW() - INTERVAL '7 years'")
            elif age_range == "36-45":
                base_conditions.append("u.created_at BETWEEN NOW() - INTERVAL '25 years' AND NOW() - INTERVAL '15 years'")
            elif age_range == "46+":
                base_conditions.append("u.created_at < NOW() - INTERVAL '25 years'")
        
        where_clause = " AND ".join(base_conditions)
        
        # Get all potential matches with their personality results
        cursor = db.execute_query(f"""
            SELECT 
                u.id, u.username, u.first_name, u.last_name, u.bio, u.avatar_url, u.created_at,
                r.extraversion, r.agreeableness, r.conscientiousness, 
                r.emotional_stability, r.intellect_imagination
            FROM users u
            JOIN results r ON u.id = r.user_id
            WHERE {where_clause}
        """, base_params)
        
        all_users = cursor.fetchall()
        
        print(f"Debug: Found {len(all_users)} potential matches for user {user_id}")
        
        if not all_users:
            return DiscoverResponse(
                users=[],
                total_count=0,
                page=page,
                limit=limit,
                has_more=False
            )
        
        # Prepare data for KNN
        knn_data = {}
        user_data_map = {}
        
        for user in all_users:
            user_key = str(user['id'])
            
            # Validate personality data
            personality_values = [
                user['extraversion'],
                user['agreeableness'],
                user['conscientiousness'],
                user['emotional_stability'],
                user['intellect_imagination']
            ]
            
            # Skip users with invalid personality data
            if any(val is None for val in personality_values):
                print(f"Debug: Skipping user {user_key} - missing personality data")
                continue
                
            personality_vector = np.array(personality_values, dtype=float)
            
            # Validate the vector has reasonable values
            if np.any(np.isnan(personality_vector)) or np.any(personality_vector < 0) or np.any(personality_vector > 100):
                print(f"Debug: Skipping user {user_key} - invalid personality values: {personality_vector}")
                continue
            
            knn_data[user_key] = personality_vector
            user_data_map[user_key] = dict(user)
        
        print(f"Debug: Prepared KNN data for {len(knn_data)} users")
        
        # Use KNN to find similar users
        nearest_neighbors = []
        if len(knn_data) > 0:
            try:
                knn = KNearestNeighbors(knn_data)
                # Get all available users (can't ask for more than exist)
                k_results = len(knn_data)  # Use exact number of available users
                print(f"Debug: Running KNN with k={k_results}")
                nearest_neighbors = knn.find_k_nearest_vectorized(user_vector, k=k_results)
                print(f"Debug: KNN returned {len(nearest_neighbors)} neighbors")
            except Exception as knn_error:
                print(f"KNN Error: {knn_error}")
                # If KNN fails, just return users in order they were found
                nearest_neighbors = [(str(user['id']), 0.0) for user in all_users]
        
        # Calculate compatibility scores and prepare response data
        compatible_users_data = []
        
        for user_id_str, distance in nearest_neighbors:
            user_data = user_data_map[user_id_str]
            other_user_id = int(user_id_str)
            
            # Calculate compatibility score
            other_vector = knn_data[user_id_str]
            compatibility_score = calculate_compatibility_score(user_vector, other_vector)
            
            # Apply compatibility filter
            if min_compatibility and min_compatibility != "all":
                min_score = float(min_compatibility)
                if compatibility_score < min_score:
                    continue
            
            # Get friend status
            cursor = db.execute_query("""
                SELECT status FROM friends 
                WHERE (user_id = %s AND friend_user_id = %s) 
                   OR (user_id = %s AND friend_user_id = %s)
            """, (current_user['user_id'], other_user_id, other_user_id, current_user['user_id']))
            
            friend_result = cursor.fetchone()
            friend_status = friend_result['status'] if friend_result else "none"
            
            # Get mutual friends count
            cursor = db.execute_query("""
                SELECT COUNT(*) as mutual_count FROM (
                    SELECT friend_user_id FROM friends 
                    WHERE user_id = %s AND status = 'accepted'
                    INTERSECT
                    SELECT friend_user_id FROM friends 
                    WHERE user_id = %s AND status = 'accepted'
                ) as mutual
            """, (current_user['user_id'], other_user_id))
            
            mutual_result = cursor.fetchone()
            mutual_friends = mutual_result['mutual_count'] if mutual_result else 0
            
            compatible_users_data.append({
                'user_data': user_data,
                'compatibility_score': compatibility_score,
                'distance': distance,
                'friend_status': friend_status,
                'mutual_friends': mutual_friends
            })
        
        # Sort by compatibility score (highest first)
        compatible_users_data.sort(key=lambda x: x['compatibility_score'], reverse=True)
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_users = compatible_users_data[start_idx:end_idx]
        
        # Convert to response format
        compatible_users = []
        for item in paginated_users:
            user_data = item['user_data']
            
            compatible_user = CompatibleUser(
                id=user_data['id'],
                username=user_data['username'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                bio=user_data['bio'],
                avatar_url=user_data['avatar_url'],
                created_at=user_data['created_at'],
                personality_results=PersonalityResults(
                    extraversion=user_data['extraversion'],
                    agreeableness=user_data['agreeableness'],
                    conscientiousness=user_data['conscientiousness'],
                    emotional_stability=user_data['emotional_stability'],
                    intellect_imagination=user_data['intellect_imagination']
                ),
                compatibility_score=item['compatibility_score'],
                distance=item['distance'],
                friend_status=item['friend_status'],
                mutual_friends=item['mutual_friends']
            )
            compatible_users.append(compatible_user)
        
        return DiscoverResponse(
            users=compatible_users,
            total_count=len(compatible_users_data),
            page=page,
            limit=limit,
            has_more=end_idx < len(compatible_users_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error finding compatible users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to find compatible users: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@discover_router.get("/stats")
async def get_discover_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get discovery statistics for the current user"""
    try:
        db = DatabaseManager()
        user_id = current_user['user_id']
        
        # Check if user has personality results
        cursor = db.execute_query("""
            SELECT COUNT(*) as has_results FROM results 
            WHERE user_id = %s AND is_current = TRUE
        """, (user_id,))
        
        has_results = cursor.fetchone()['has_results'] > 0
        
        if not has_results:
            return {
                "has_personality_results": False,
                "total_potential_matches": 0,
                "pending_friend_requests": 0,
                "accepted_friends": 0
            }
        
        # Get total potential matches (users with personality results, excluding self and existing friends)
        cursor = db.execute_query("""
            SELECT COUNT(*) as potential_matches FROM users u
            JOIN results r ON u.id = r.user_id
            WHERE u.id != %s 
              AND u.is_active = TRUE 
              AND u.is_deleted = FALSE
              AND r.is_current = TRUE
              AND u.id NOT IN (
                  SELECT CASE 
                      WHEN user_id = %s THEN friend_user_id 
                      ELSE user_id 
                  END
                  FROM friends 
                  WHERE (user_id = %s OR friend_user_id = %s) 
                    AND status IN ('accepted', 'pending')
              )
        """, (user_id, user_id, user_id, user_id))
        
        potential_matches = cursor.fetchone()['potential_matches']
        
        # Get pending friend requests (sent by user)
        cursor = db.execute_query("""
            SELECT COUNT(*) as pending_requests FROM friends 
            WHERE user_id = %s AND status = 'pending'
        """, (user_id,))
        
        pending_requests = cursor.fetchone()['pending_requests']
        
        # Get accepted friends
        cursor = db.execute_query("""
            SELECT COUNT(*) as accepted_friends FROM friends 
            WHERE (user_id = %s OR friend_user_id = %s) AND status = 'accepted'
        """, (user_id, user_id))
        
        accepted_friends = cursor.fetchone()['accepted_friends']
        
        return {
            "has_personality_results": True,
            "total_potential_matches": potential_matches,
            "pending_friend_requests": pending_requests,
            "accepted_friends": accepted_friends
        }
        
    except Exception as e:
        print(f"Error getting discover stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get discover stats: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@discover_router.get("/personality-insights")
async def get_personality_insights(
    current_user: dict = Depends(get_current_user)
):
    """Get personality insights and matching preferences"""
    try:
        db = DatabaseManager()
        user_id = current_user['user_id']
        
        # Get user's personality results
        cursor = db.execute_query("""
            SELECT extraversion, agreeableness, conscientiousness, 
                   emotional_stability, intellect_imagination
            FROM results 
            WHERE user_id = %s AND is_current = TRUE
        """, (user_id,))
        
        user_results = cursor.fetchone()
        if not user_results:
            raise HTTPException(status_code=400, detail="Personality results not found")
        
        # Calculate what types of personalities would be most compatible
        insights = {
            "your_profile": {
                "extraversion": user_results['extraversion'],
                "agreeableness": user_results['agreeableness'],
                "conscientiousness": user_results['conscientiousness'],
                "emotional_stability": user_results['emotional_stability'],
                "intellect_imagination": user_results['intellect_imagination']
            },
            "ideal_match_ranges": {},
            "compatibility_tips": []
        }
        
        # Generate ideal match ranges based on user's scores
        for trait, score in user_results.items():
            if trait in ['extraversion', 'agreeableness', 'conscientiousness', 'emotional_stability', 'intellect_imagination']:
                # For most traits, look for people within 20-30 points of user's score
                min_range = max(0, score - 25)
                max_range = min(100, score + 25)
                insights["ideal_match_ranges"][trait] = {
                    "min": min_range,
                    "max": max_range
                }
        
        # Generate compatibility tips based on user's profile
        if user_results['extraversion'] > 70:
            insights["compatibility_tips"].append("You're highly extraverted - look for people who enjoy social activities and group settings.")
        elif user_results['extraversion'] < 40:
            insights["compatibility_tips"].append("You prefer quieter settings - seek friends who appreciate deep, meaningful conversations.")
        
        if user_results['agreeableness'] > 70:
            insights["compatibility_tips"].append("Your cooperative nature pairs well with others who value harmony and teamwork.")
        
        if user_results['conscientiousness'] > 70:
            insights["compatibility_tips"].append("You're highly organized - you'll connect well with goal-oriented, reliable people.")
        
        if user_results['emotional_stability'] > 70:
            insights["compatibility_tips"].append("Your emotional stability makes you a great support for others going through challenges.")
        
        if user_results['intellect_imagination'] > 70:
            insights["compatibility_tips"].append("Your creativity and openness to experience attracts like-minded innovative thinkers.")
        
        return insights
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting personality insights: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get personality insights: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()