// In frontend/src/hooks/use-auth.ts - Update the useAuth hook:

"use client"

import { useState, useEffect, useCallback } from "react"
import type { User, AuthResponse, LoginRequest, SignupRequest } from "../types/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkSession = useCallback(async () => {
    try {
      setLoading(true)
      const sessionId = localStorage.getItem("session_id")

      console.log("Checking session with ID:", sessionId) // Debug log

      if (!sessionId) {
        console.log("No session ID found in localStorage")
        setLoading(false)
        return
      }

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      })

      const data: AuthResponse = await response.json()
      console.log("Session verification response:", data) // Debug log

      if (data.success && data.user) {
        setUser(data.user)
        console.log("Session verified successfully for user:", data.user.email)
      } else {
        console.log("Session verification failed:", data.message)
        localStorage.removeItem("session_id")
        setUser(null)
      }
    } catch (err) {
      console.error("Session verification failed:", err)
      localStorage.removeItem("session_id")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      setError(null)
      setLoading(true)

      console.log("Attempting login for:", credentials.email) // Debug log

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data: AuthResponse = await response.json()
      console.log("Login response:", data) // Debug log

      if (data.success && data.user && data.session) {
        setUser(data.user)
        localStorage.setItem("session_id", data.session.id)
        console.log("Login successful, session stored:", data.session.id)
      } else {
        setError(data.message || "Login failed")
        console.log("Login failed:", data.message)
      }

      return data
    } catch (err) {
      const errorMessage = "Login failed. Please try again."
      console.error("Login error:", err)
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (userData: SignupRequest): Promise<AuthResponse> => {
    try {
      setError(null)
      setLoading(true)

      console.log("Attempting signup for:", userData.email) // Debug log

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      const data: AuthResponse = await response.json()
      console.log("Signup response:", data) // Debug log

      if (data.success && data.user && data.session) {
        setUser(data.user)
        localStorage.setItem("session_id", data.session.id)
        console.log("Signup successful, session stored:", data.session.id)
      } else {
        setError(data.message || "Signup failed")
        console.log("Signup failed:", data.message)
      }

      return data
    } catch (err) {
      const errorMessage = "Signup failed. Please try again."
      console.error("Signup error:", err)
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem("session_id")
      console.log("Attempting logout with session:", sessionId) // Debug log
      
      if (sessionId) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
      }
    } catch (err) {
      console.error("Logout failed:", err)
    } finally {
      localStorage.removeItem("session_id")
      setUser(null)
      console.log("Logout completed, session cleared")
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    checkSession,
  }
}