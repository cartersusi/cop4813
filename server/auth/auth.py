from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import os
from datetime import datetime
import re

# Import your existing database manager from root directory
from server.db.db import DatabaseManager

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class SessionVerifyRequest(BaseModel):
    session_id: str

class LogoutRequest(BaseModel):
    session_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class SessionResponse(BaseModel):
    id: str
    user_id: str
    expires_at: str
    last_accessed_at: str
    is_active: bool

class AuthResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    user: Optional[UserResponse] = None
    session: Optional[SessionResponse] = None

# Create router
auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])

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

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def get_user_agent(request: Request) -> str:
    """Extract user agent from request."""
    return request.headers.get("User-Agent", "unknown")

def validate_password(password: str) -> bool:
    """Validate password strength."""
    if len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True

def validate_username(username: str) -> bool:
    """Validate username format."""
    if len(username) < 3 or len(username) > 50:
        return False
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return False
    return True


# Also fix the login function:
@auth_router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest, 
    http_request: Request,
    db: DatabaseManager = Depends(get_db)
):
    """Authenticate user and create session."""
    try:
         # Get client info
        ip_address = get_client_ip(http_request)
        user_agent = get_user_agent(http_request)
        
        # Authenticate user
        user_data = db.authenticate_user(request.email, request.password)
        
        if not user_data:
            # Log failed login attempt
            db.log_security_event(
                user_id=None,
                event_type="login_failed",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="Invalid credentials"
            )
            return AuthResponse(
                success=False,
                message="Invalid email or password"
            )
        
        # Check if user account is active
        if not user_data.get("is_active") or user_data.get("is_deleted"):
            db.log_security_event(
                user_id=user_data["id"],
                event_type="login_failed",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="Account inactive or deleted"
            )
            return AuthResponse(
                success=False,
                message="Account is inactive or has been deleted"
            )
        
        # Create session
        device_info = user_agent
        session_id = db.create_session(
            user_id=user_data["id"],
            device_info=device_info,
            ip_address=ip_address,
            duration_hours=24 * 7  # 7 days
        )
        
        # Get session info
        cursor = db.execute_query(
            "SELECT * FROM user_sessions WHERE id = %s",
            (session_id,)
        )
        session_data = dict(cursor.fetchone())
        
        # Format user name from first_name and last_name
        name_parts = []
        if user_data.get("first_name"):
            name_parts.append(user_data["first_name"])
        if user_data.get("last_name"):
            name_parts.append(user_data["last_name"])
        full_name = " ".join(name_parts) if name_parts else user_data.get("username", "")
        
        # Format user data for response
        user_response = UserResponse(
            id=str(user_data["id"]),
            email=user_data["email"],
            name=full_name,
            created_at=user_data["created_at"].isoformat()
        )
        
        # Format session data for response
        session_response = SessionResponse(
            id=str(session_data["id"]),  # Ensure this is a string
            user_id=str(session_data["user_id"]),
            expires_at=session_data["expires_at"].isoformat(),
            last_accessed_at=session_data["last_accessed_at"].isoformat(),
            is_active=session_data["is_active"]
        )
        
        return AuthResponse(
            success=True,
            message="Login successful",
            user=user_response,
            session=session_response
        )
        
    except Exception as e:
        print(f"Login error: {e}")
        return AuthResponse(
            success=False,
            message="An error occurred during login"
        )

@auth_router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignupRequest,
    http_request: Request,
    db: DatabaseManager = Depends(get_db)
):
    """Register new user and create session."""
    try:
        # Get client info
        ip_address = get_client_ip(http_request)
        user_agent = get_user_agent(http_request)
        
        # Create username from name (simple approach)
        username = request.name.lower().replace(" ", "_")
        
        # Validate input
        if not validate_username(username):
            return AuthResponse(
                success=False,
                message="Name must be 3-50 characters and contain only letters, numbers, and spaces"
            )
        
        if not validate_password(request.password):
            return AuthResponse(
                success=False,
                message="Password must be at least 8 characters with letters and numbers"
            )
        
        # Check if user already exists
        existing_user = db.get_user_by_email(request.email)
        if existing_user:
            return AuthResponse(
                success=False,
                message="An account with this email already exists"
            )
        
        # Check if username is taken, if so add numbers
        base_username = username
        counter = 1
        while True:
            cursor = db.execute_query(
                "SELECT id FROM users WHERE username = %s AND is_deleted = FALSE",
                (username,)
            )
            if not cursor.fetchone():
                break
            username = f"{base_username}_{counter}"
            counter += 1
        
        # Split name into first/last name
        name_parts = request.name.strip().split()
        first_name = name_parts[0] if name_parts else request.name
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else None
        
        # Create user
        user_id = db.create_user(
            username=username,
            email=request.email,
            password=request.password,
            first_name=first_name,
            last_name=last_name
        )
        
        if not user_id:
            return AuthResponse(
                success=False,
                message="Failed to create account. Please try again."
            )
        
        # Get created user data
        cursor = db.execute_query(
            "SELECT * FROM users WHERE id = %s",
            (user_id,)
        )
        user_data = dict(cursor.fetchone())
        
        # Create session
        device_info = user_agent
        session_id = db.create_session(
            user_id=user_id,
            device_info=device_info,
            ip_address=ip_address,
            duration_hours=24 * 7  # 7 days
        )
        
        # Get session info
        cursor = db.execute_query(
            "SELECT * FROM user_sessions WHERE id = %s",
            (session_id,)
        )
        session_data = dict(cursor.fetchone())
        
        # Log successful signup
        db.log_security_event(
            user_id=user_id,
            event_type="user_created",
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
        
        # Format user data for response
        user_response = UserResponse(
            id=str(user_data["id"]),
            email=user_data["email"],
            name=request.name,  # Use original name from request
            created_at=user_data["created_at"].isoformat()
        )
        
        # Format session data for response
        session_response = SessionResponse(
            id=session_data["id"],
            user_id=str(session_data["user_id"]),
            expires_at=session_data["expires_at"].isoformat(),
            last_accessed_at=session_data["last_accessed_at"].isoformat(),
            is_active=session_data["is_active"]
        )
        
        return AuthResponse(
            success=True,
            message="Account created successfully",
            user=user_response,
            session=session_response
        )
        
    except Exception as e:
        print(f"Signup error: {e}")
        return AuthResponse(
            success=False,
            message="An error occurred during signup"
        )

@auth_router.post("/verify", response_model=AuthResponse)
async def verify_session(
    request: SessionVerifyRequest,
    http_request: Request,
    db: DatabaseManager = Depends(get_db)
):
    """Verify if session is valid and return user data."""
    try:
        # Get client info
        ip_address = get_client_ip(http_request)
        
        # Check if session exists and is valid
        cursor = db.execute_query("""
            SELECT s.*, u.* FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = %s AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
            AND u.is_active = TRUE AND u.is_deleted = FALSE
        """, (request.session_id,))
        
        session_user_data = cursor.fetchone()
        
        if not session_user_data:
            return AuthResponse(
                success=False,
                message="Invalid or expired session"
            )
        
        # Update last accessed time
        db.execute_query(
            "UPDATE user_sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = %s",
            (request.session_id,)
        )
        
        # Convert to dict for easier access
        data = dict(session_user_data)
        
        # Format user name from first_name and last_name
        name_parts = []
        if data.get("first_name"):
            name_parts.append(data["first_name"])
        if data.get("last_name"):
            name_parts.append(data["last_name"])
        full_name = " ".join(name_parts) if name_parts else data.get("username", "")
        
        # Format user data for response
        user_response = UserResponse(
            id=str(data["user_id"]),  # Use user_id from session table
            email=data["email"],
            name=full_name,
            created_at=data["created_at"].isoformat()
        )
        
        # Format session data for response - FIX: Ensure all values are strings
        session_response = SessionResponse(
            id=str(data["id"]),  # Convert session ID to string
            user_id=str(data["user_id"]),
            expires_at=data["expires_at"].isoformat(),
            last_accessed_at=data["last_accessed_at"].isoformat(),
            is_active=data["is_active"]
        )
        
        return AuthResponse(
            success=True,
            message="Session valid",
            user=user_response,
            session=session_response
        )
        
    except Exception as e:
        print(f"Session verification error: {e}")
        return AuthResponse(
            success=False,
            message="Session verification failed"
        )

@auth_router.post("/logout", response_model=AuthResponse)
async def logout(
    request: LogoutRequest,
    http_request: Request,
    db: DatabaseManager = Depends(get_db)
):
    """Logout user and invalidate session."""
    try:
        # Get client info
        ip_address = get_client_ip(http_request)
        user_agent = get_user_agent(http_request)
        
        # Get session info before deactivating
        cursor = db.execute_query(
            "SELECT user_id FROM user_sessions WHERE id = %s",
            (request.session_id,)
        )
        session_data = cursor.fetchone()
        
        # Deactivate session
        db.execute_query(
            "UPDATE user_sessions SET is_active = FALSE WHERE id = %s",
            (request.session_id,)
        )
        
        # Log logout event
        if session_data:
            db.log_security_event(
                user_id=session_data["user_id"],
                event_type="logout",
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )
        
        return AuthResponse(
            success=True,
            message="Logged out successfully"
        )
        
    except Exception as e:
        print(f"Logout error: {e}")
        return AuthResponse(
            success=True,  # Still return success even if logging fails
            message="Logged out successfully"
        )

@auth_router.get("/me", response_model=AuthResponse)
async def get_current_user(
    session_id: str,
    db: DatabaseManager = Depends(get_db)
):
    """Get current user data by session ID (alternative endpoint)."""
    try:
        # Check if session exists and is valid
        cursor = db.execute_query("""
            SELECT u.* FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = %s AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
            AND u.is_active = TRUE AND u.is_deleted = FALSE
        """, (session_id,))
        
        user_data = cursor.fetchone()
        
        if not user_data:
            return AuthResponse(
                success=False,
                message="Invalid or expired session"
            )
        
        return AuthResponse(
            success=True,
            user=UserResponse(**dict(user_data))
        )
        
    except Exception as e:
        print(f"Get current user error: {e}")
        return AuthResponse(
            success=False,
            message="Failed to get user data"
        )

# Cleanup endpoint for expired sessions (optional - can be called by a cron job)
@auth_router.post("/cleanup-sessions")
async def cleanup_expired_sessions(db: DatabaseManager = Depends(get_db)):
    """Remove expired sessions (admin endpoint)."""
    try:
        cleaned_count = db.cleanup_expired_sessions()
        return {"success": True, "cleaned_sessions": cleaned_count}
    except Exception as e:
        print(f"Session cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Session cleanup failed")