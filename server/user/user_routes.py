from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from server.auth.auth import verify_session
from server.db.db import DatabaseManager

# Create router
user_router = APIRouter(prefix="/api/users", tags=["users"])
friends_router = APIRouter(prefix="/api/friends", tags=["friends"])
security = HTTPBearer()

# WebSocket endpoint for real-time notifications (optional advanced feature)
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except:
                    # Remove dead connections
                    self.active_connections[user_id].remove(connection)


# Pydantic models
class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime
    friend_count: int
    post_count: int
    personality_results: Optional[Dict[str, float]]

class PostItem(BaseModel):
    id: int
    title: str
    body: Optional[str]
    status: str
    visibility: str
    created_at: datetime
    updated_at: datetime

class FriendStatus(BaseModel):
    status: str  # "none", "pending", "accepted", "blocked"
    requested_by: Optional[int]

class FriendRequest(BaseModel):
    friend_user_id: int

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

@user_router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get user profile by ID"""
    try:
        db = DatabaseManager()
        
        # Get user basic info
        cursor = db.execute_query("""
            SELECT id, username, email, first_name, last_name, bio, avatar_url, 
                   is_active, created_at
            FROM users 
            WHERE id = %s AND is_deleted = FALSE
        """, (user_id,))
        
        user_data = cursor.fetchone()
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_dict = dict(user_data)
        
        # Hide email if not own profile
        if current_user['user_id'] != user_id:
            user_dict['email'] = "hidden"
        
        # Get friend count
        cursor = db.execute_query("""
            SELECT COUNT(*) as count FROM friends 
            WHERE (user_id = %s OR friend_user_id = %s) AND status = 'accepted'
        """, (user_id, user_id))
        friend_count = cursor.fetchone()['count']
        
        # Get post count
        cursor = db.execute_query("""
            SELECT COUNT(*) as count FROM posts 
            WHERE user_id = %s AND status != 'deleted'
        """, (user_id,))
        post_count = cursor.fetchone()['count']
        
        # Get personality results
        cursor = db.execute_query("""
            SELECT extraversion, agreeableness, conscientiousness, 
                   emotional_stability, intellect_imagination
            FROM results 
            WHERE user_id = %s AND is_current = TRUE
        """, (user_id,))
        
        personality_results = cursor.fetchone()
        personality_dict = None
        if personality_results:
            personality_dict = {
                "extraversion": personality_results['extraversion'],
                "agreeableness": personality_results['agreeableness'],
                "conscientiousness": personality_results['conscientiousness'],
                "emotional_stability": personality_results['emotional_stability'],
                "intellect_imagination": personality_results['intellect_imagination']
            }
        
        return UserProfile(
            id=user_dict['id'],
            username=user_dict['username'],
            email=user_dict['email'],
            first_name=user_dict['first_name'],
            last_name=user_dict['last_name'],
            bio=user_dict['bio'],
            avatar_url=user_dict['avatar_url'],
            is_active=user_dict['is_active'],
            created_at=user_dict['created_at'],
            friend_count=friend_count,
            post_count=post_count,
            personality_results=personality_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user profile: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@user_router.get("/{user_id}/posts", response_model=List[PostItem])
async def get_user_posts(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's posts"""
    try:
        db = DatabaseManager()
        
        # Check if user exists
        cursor = db.execute_query("SELECT id FROM users WHERE id = %s AND is_deleted = FALSE", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Determine visibility based on relationship
        visibility_filter = ""
        if current_user['user_id'] != user_id:
            # Check if they are friends
            cursor = db.execute_query("""
                SELECT status FROM friends 
                WHERE ((user_id = %s AND friend_user_id = %s) 
                   OR (user_id = %s AND friend_user_id = %s))
                   AND status = 'accepted'
            """, (current_user['user_id'], user_id, user_id, current_user['user_id']))
            
            are_friends = cursor.fetchone() is not None
            
            if are_friends:
                visibility_filter = "AND visibility IN ('public', 'friends')"
            else:
                visibility_filter = "AND visibility = 'public'"
        
        # Get posts
        cursor = db.execute_query(f"""
            SELECT id, title, body, status, visibility, created_at, updated_at
            FROM posts 
            WHERE user_id = %s AND status = 'published' {visibility_filter}
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))
        
        posts = cursor.fetchall()
        
        return [
            PostItem(
                id=post['id'],
                title=post['title'],
                body=post['body'],
                status=post['status'],
                visibility=post['visibility'],
                created_at=post['created_at'],
                updated_at=post['updated_at']
            ) for post in posts
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user posts: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

# Fixed backend endpoints for your friends table schema
# Add these routes to your existing user_routes.py or friends_router

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import json

# Fixed route for getting pending friend requests
@friends_router.get("/requests/pending")
async def get_pending_friend_requests(
    current_user: dict = Depends(get_current_user)
):
    """Get all pending friend requests for the current user"""
    try:
        db = DatabaseManager()
        
        # Get pending friend requests where current user is the recipient
        # Note: Since friends table doesn't have an 'id' column, we'll use user_id + friend_user_id as identifier
        cursor = db.execute_query("""
            SELECT 
                f.user_id,
                f.friend_user_id,
                f.status,
                f.requested_by,
                f.created_at,
                f.updated_at,
                u.id as requester_id,
                u.username as requester_username,
                u.first_name as requester_first_name,
                u.last_name as requester_last_name,
                u.avatar_url as requester_avatar_url
            FROM friends f
            JOIN users u ON f.requested_by = u.id
            WHERE f.friend_user_id = %s 
            AND f.status = 'pending'
            ORDER BY f.created_at DESC
        """, (current_user['user_id'],))
        
        requests = cursor.fetchall()
        
        # Format the response
        formatted_requests = []
        for request in requests:
            # Create a unique identifier using user_id and friend_user_id
            request_id = f"{request['user_id']}_{request['friend_user_id']}"
            
            formatted_requests.append({
                "id": request_id,  # Composite ID for frontend identification
                "user_id": request['user_id'],
                "friend_user_id": request['friend_user_id'],
                "status": request['status'],
                "requested_by": request['requested_by'],
                "created_at": request['created_at'].isoformat() if request['created_at'] else None,
                "updated_at": request['updated_at'].isoformat() if request['updated_at'] else None,
                "requester": {
                    "id": request['requester_id'],
                    "username": request['requester_username'],
                    "first_name": request['requester_first_name'],
                    "last_name": request['requester_last_name'],
                    "avatar_url": request['requester_avatar_url']
                }
            })
        
        return {
            "success": True,
            "requests": formatted_requests,
            "count": len(formatted_requests)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch friend requests: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@friends_router.delete("/decline/{user_id}")
async def decline_friend_request(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Decline a friend request"""
    try:
        db = DatabaseManager()
        
        # Check if there's a pending request
        cursor = db.execute_query("""
            SELECT user_id, friend_user_id FROM friends 
            WHERE user_id = %s AND friend_user_id = %s AND status = 'pending'
        """, (user_id, current_user['user_id']))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="No pending friend request found")
        
        # Delete the friend request (decline)
        db.execute_query("""
            DELETE FROM friends 
            WHERE user_id = %s AND friend_user_id = %s AND status = 'pending'
        """, (user_id, current_user['user_id']))
        
        return {"success": True, "message": "Friend request declined"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decline friend request: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

# Fixed route for getting friend request count
@friends_router.get("/requests/count")
async def get_friend_request_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of pending friend requests for the current user"""
    try:
        db = DatabaseManager()
        
        cursor = db.execute_query("""
            SELECT COUNT(*) as count
            FROM friends 
            WHERE friend_user_id = %s AND status = 'pending'
        """, (current_user['user_id'],))
        
        result = cursor.fetchone()
        count = result['count'] if result else 0
        
        return {
            "success": True,
            "count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get friend request count: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

# Enhanced version of the existing accept endpoint
@friends_router.post("/accept/{user_id}")
async def accept_friend_request(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Accept a friend request"""
    try:
        db = DatabaseManager()
        
        # Check if there's a pending request and get requester info
        cursor = db.execute_query("""
            SELECT f.user_id, f.friend_user_id, u.first_name, u.last_name, u.username 
            FROM friends f
            JOIN users u ON f.requested_by = u.id
            WHERE f.user_id = %s AND f.friend_user_id = %s AND f.status = 'pending'
        """, (user_id, current_user['user_id']))
        
        request_data = cursor.fetchone()
        if not request_data:
            raise HTTPException(status_code=404, detail="No pending friend request found")
        
        # Update status to accepted
        db.execute_query("""
            UPDATE friends 
            SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND friend_user_id = %s
        """, (user_id, current_user['user_id']))
        
        # Get requester name for response
        requester_name = f"{request_data['first_name'] or ''} {request_data['last_name'] or ''}".strip()
        if not requester_name:
            requester_name = request_data['username']
        
        return {
            "success": True, 
            "message": "Friend request accepted",
            "requester_name": requester_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept friend request: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

# Updated send friend request endpoint to work with your schema
@friends_router.post("/request")
async def send_friend_request(
    request: FriendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a friend request"""
    try:
        db = DatabaseManager()
        
        # Validate friend user exists
        cursor = db.execute_query("SELECT id, first_name, last_name, username FROM users WHERE id = %s", (request.friend_user_id,))
        friend_user = cursor.fetchone()
        if not friend_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already friends or request exists
        cursor = db.execute_query("""
            SELECT status FROM friends 
            WHERE (user_id = %s AND friend_user_id = %s) 
            OR (user_id = %s AND friend_user_id = %s)
        """, (current_user['user_id'], request.friend_user_id, request.friend_user_id, current_user['user_id']))
        
        existing = cursor.fetchone()
        if existing:
            if existing['status'] == 'accepted':
                raise HTTPException(status_code=400, detail="Already friends")
            elif existing['status'] == 'pending':
                raise HTTPException(status_code=400, detail="Friend request already sent")
            elif existing['status'] == 'blocked':
                raise HTTPException(status_code=400, detail="Cannot send friend request")
        
        # Create friend request
        db.execute_query("""
            INSERT INTO friends (user_id, friend_user_id, status, requested_by, created_at, updated_at)
            VALUES (%s, %s, 'pending', %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (current_user['user_id'], request.friend_user_id, current_user['user_id']))
        
        return {"success": True, "message": "Friend request sent"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send friend request: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

# Helper function to parse composite request ID (for frontend compatibility)
def parse_request_id(request_id: str) -> tuple:
    """Parse composite request ID back to user_id and friend_user_id"""
    try:
        user_id, friend_user_id = request_id.split('_')
        return int(user_id), int(friend_user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid request ID format")