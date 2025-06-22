export interface User {
    id: string
    email: string
    name: string
    created_at: string
  }
  
  export interface Session {
    id: string
    user_id: string
    expires_at: string
    last_accessed_at: string
    is_active: boolean
  }
  
  export interface LoginRequest {
    email: string
    password: string
  }
  
  export interface SignupRequest {
    name: string
    email: string
    password: string
  }
  
  export interface AuthResponse {
    success: boolean
    user?: User
    session?: Session
    message?: string
  }
  
  export interface SessionVerifyRequest {
    session_id: string
  }
  
  export interface LogoutRequest {
    session_id: string
  }