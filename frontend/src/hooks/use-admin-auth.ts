// In frontend/src/hooks/use-admin-auth.ts - Update the admin auth hook:

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"

export function useAdminAuth() {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      if (loading) return

      if (!user) {
        setIsAdmin(false)
        setChecking(false)
        return
      }

      try {
        const sessionId = localStorage.getItem("session_id")
        console.log("Checking admin role with session:", sessionId) // Debug log

        if (!sessionId) {
          console.log("No session ID found for admin check")
          setIsAdmin(false)
          setChecking(false)
          return
        }

        const response = await fetch("/api/admin/check-role", {
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Admin role check response:", data) // Debug log
        
        setIsAdmin(data.isAdmin || false)
      } catch (error) {
        console.error("Error checking admin role:", error)
        setIsAdmin(false)
      } finally {
        setChecking(false)
      }
    }

    checkAdminRole()
  }, [user, loading])

  return {
    user,
    isAdmin,
    loading: loading || checking,
  }
}