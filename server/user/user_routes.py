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

@friends_router.get("/status/{user_id}", response_model=FriendStatus)
async def get_friend_status(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get friendship status with a user"""
    try:
        db = DatabaseManager()
        
        cursor = db.execute_query("""
            SELECT status, requested_by FROM friends 
            WHERE (user_id = %s AND friend_user_id = %s) 
               OR (user_id = %s AND friend_user_id = %s)
        """, (current_user['user_id'], user_id, user_id, current_user['user_id']))
        
        friendship = cursor.fetchone()
        
        if not friendship:
            return FriendStatus(status="none")
        
        return FriendStatus(
            status=friendship['status'],
            requested_by=friendship['requested_by']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get friend status: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@friends_router.post("/request")
async def send_friend_request(
    request: FriendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a friend request"""
    try:
        db = DatabaseManager()
        
        # Check if user exists
        cursor = db.execute_query("SELECT id FROM users WHERE id = %s AND is_deleted = FALSE", (request.friend_user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if friendship already exists
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

@friends_router.post("/accept/{user_id}")
async def accept_friend_request(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Accept a friend request"""
    try:
        db = DatabaseManager()
        
        # Check if there's a pending request
        cursor = db.execute_query("""
            SELECT id FROM friends 
            WHERE user_id = %s AND friend_user_id = %s AND status = 'pending'
        """, (user_id, current_user['user_id']))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="No pending friend request found")
        
        # Update status to accepted
        db.execute_query("""
            UPDATE friends 
            SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND friend_user_id = %s
        """, (user_id, current_user['user_id']))
        
        return {"success": True, "message": "Friend request accepted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept friend request: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@friends_router.delete("/remove/{user_id}")
async def remove_friend(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Remove a friend or cancel friend request"""
    try:
        db = DatabaseManager()
        
        # Remove friendship (works for both directions)
        db.execute_query("""
            DELETE FROM friends 
            WHERE (user_id = %s AND friend_user_id = %s) 
               OR (user_id = %s AND friend_user_id = %s)
        """, (current_user['user_id'], user_id, user_id, current_user['user_id']))
        
        return {"success": True, "message": "Friend removed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove friend: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@friends_router.get("/list")
async def get_friends_list(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100)
):
    """Get user's friends list"""
    try:
        db = DatabaseManager()
        
        cursor = db.execute_query("""
            SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url, f.created_at as friend_since
            FROM friends f
            JOIN users u ON (
                CASE 
                    WHEN f.user_id = %s THEN u.id = f.friend_user_id
                    ELSE u.id = f.user_id
                END
            )
            WHERE (f.user_id = %s OR f.friend_user_id = %s) 
              AND f.status = 'accepted'
              AND u.is_deleted = FALSE
            ORDER BY f.created_at DESC
            LIMIT %s
        """, (current_user['user_id'], current_user['user_id'], current_user['user_id'], limit))
        
        friends = cursor.fetchall()
        
        return [
            {
                "id": friend['id'],
                "username": friend['username'],
                "first_name": friend['first_name'],
                "last_name": friend['last_name'],
                "avatar_url": friend['avatar_url'],
                "friend_since": friend['friend_since']
            } for friend in friends
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get friends list: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()