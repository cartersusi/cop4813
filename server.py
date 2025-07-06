from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from server.auth.auth import auth_router
from server.admin.admin_routes import admin_router


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

@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="React app not found")

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