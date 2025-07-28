from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.websockets import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from datetime import datetime

from server.auth.auth import auth_router
from server.admin.admin_routes import admin_router
from server.user.user_routes import user_router, friends_router, ConnectionManager, get_current_user, FriendRequest
from server.knn.quiz_routes import quiz_router
from server.knn.discover import discover_router
from server.db.db import DatabaseManager


# Create FastAPI instance
app = FastAPI(title="FastAPI React Server", version="1.0.0")

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = "./frontend/dist"

# API Routes

# Auth routes
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(friends_router)
app.include_router(quiz_router)
app.include_router(discover_router)

@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="React app not found")
    
manager = ConnectionManager()

@app.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Function to notify user of new friend request (call this when a friend request is created)
async def notify_friend_request(friend_user_id: int, requester_name: str):
    message = json.dumps({
        "type": "friend_request",
        "message": f"{requester_name} sent you a friend request",
        "timestamp": datetime.now().isoformat()
    })
    await manager.send_personal_message(message, friend_user_id)

# Update your existing send friend request endpoint to include notification
@friends_router.post("/request")
async def send_friend_request(
    request: FriendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a friend request with real-time notification"""
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
        
        # Send real-time notification
        requester_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        if not requester_name:
            requester_name = current_user.get('username', 'Someone')
        
        await notify_friend_request(request.friend_user_id, requester_name)
        
        return {"success": True, "message": "Friend request sent"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send friend request: {str(e)}")
    finally:
        if 'db' in locals():
            db.disconnect()

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API is working"}

@app.get("/api/example")
async def get_example():
    return {"example key": "example value"}

if os.path.exists(static_dir):
    # Serve static files (CSS, JS, images, etc.)
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")
    
    # Serve React app for all other routes (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Don't serve React app for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Serve specific files if they exist
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Default to index.html for SPA routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        else:
            raise HTTPException(status_code=404, detail="React app not found")

else:
    @app.get("/app")
    async def react_app_info():
        return {
            "message": "React app not found", 
            "instructions": "Build your React app and place the build folder in the same directory as this Python file"
        }

if __name__ == "__main__":
    import uvicorn
    
    # Check if React build exists
    if not os.path.exists(static_dir):
        print(f"\n⚠️  Warning: React build directory '{static_dir}' not found!")
        print("To serve your React app:")
        print("1. Build your React app: npm run build")
        print("2. Copy the 'build' folder to the same directory as this Python file")
        print("3. Restart the server\n")
    
    print("🚀 Starting FastAPI server...")
    print("📱 API available at: http://localhost:8000/api/")
    print("🌐 React app available at: http://localhost:8000/")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)