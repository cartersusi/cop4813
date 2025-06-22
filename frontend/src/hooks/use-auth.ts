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

      if (!sessionId) {
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

      if (data.success && data.user) {
        setUser(data.user)
      } else {
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

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data: AuthResponse = await response.json()

      if (data.success && data.user && data.session) {
        setUser(data.user)
        localStorage.setItem("session_id", data.session.id)
      } else {
        setError(data.message || "Login failed")
      }

      return data
    } catch (err) {
      const errorMessage = "Login failed. Please try again."
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

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      const data: AuthResponse = await response.json()

      if (data.success && data.user && data.session) {
        setUser(data.user)
        localStorage.setItem("session_id", data.session.id)
      } else {
        setError(data.message || "Signup failed")
      }

      return data
    } catch (err) {
      const errorMessage = "Signup failed. Please try again."
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem("session_id")
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
