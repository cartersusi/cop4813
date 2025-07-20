"use client"

import type React from "react"
import { useLocation, useNavigate } from 'react-router-dom'

import { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Alert, AlertDescription } from "../components/ui/alert"
import { Mail, Lock, User, Loader2, CheckCircle2, Save } from "lucide-react"
import { useAuth } from "../hooks/use-auth"
import type { PersonalityScores } from "../types/quiz"

interface AuthPageProps {
  personalityScores?: PersonalityScores
  onAuthSuccess?: () => void
}

export default function Auth({ personalityScores, onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [savingResults, setSavingResults] = useState(false)
  const [resultsSaved, setResultsSaved] = useState(false)

  const { login, signup, loading, error, user } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()
  
  // Get the page they came from, or default to home
  const from = location.state?.from?.pathname || '/'

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid"
    }

    if (!formData.password) {
      errors.password = "Password is required"
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    if (!isLogin) {
      if (!formData.name) {
        errors.name = "Name is required"
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password"
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveQuizResults = async (scores: PersonalityScores) => {
    try {
      setSavingResults(true)
      
      const response = await fetch("/api/quiz/save-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify({
          extraversion: scores.extraversion,
          agreeableness: scores.agreeableness,
          conscientiousness: scores.conscientiousness,
          emotional_stability: scores.emotional_stability,
          intellect_imagination: scores.intellect_imagination,
          test_version: "1.0",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save quiz results")
      }

      const data = await response.json()
      console.log("Quiz results saved successfully:", data)
      setResultsSaved(true)
      return true
    } catch (error) {
      console.error("Error saving quiz results:", error)
      return false
    } finally {
      setSavingResults(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      let result
      if (isLogin) {
        result = await login({
          email: formData.email,
          password: formData.password,
        })
      } else {
        result = await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        })
      }

      if (result.success) {
        // If we have personality scores to save, save them now
        if (personalityScores) {
          await saveQuizResults(personalityScores)
        }
        
        onAuthSuccess?.()
        
        // Navigate with a small delay to show the success message
        setTimeout(() => {
          navigate(from, { replace: true })
        }, personalityScores ? 2000 : 500)
      }
    } catch (err) {
      console.error("Auth error:", err)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  // Auto-save results if user becomes available and we have pending scores
  useEffect(() => {
    if (user && personalityScores && !resultsSaved && !savingResults) {
      saveQuizResults(personalityScores)
    }
  }, [user, personalityScores, resultsSaved, savingResults])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      {/* Auth Content */}
      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-md mx-auto">
          {/* Results Summary (if coming from quiz) */}
          {personalityScores && (
            <Card className="border-0 shadow-lg bg-green-50 border-green-200 mb-8">
              <CardHeader className="text-center">
                <CardTitle className="text-green-800 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Quiz Complete! 🎉
                </CardTitle>
                <CardDescription className="text-green-700">
                  {resultsSaved 
                    ? "Your personality results have been saved to your profile!"
                    : "Sign up to save your personality results and find compatible friends"
                  }
                </CardDescription>
              </CardHeader>
              {(savingResults || resultsSaved) && (
                <CardContent className="pt-0">
                  <Alert className={`border-0 ${resultsSaved ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {savingResults ? (
                      <>
                        <Save className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Saving your quiz results...
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Your quiz results have been saved successfully!
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                </CardContent>
              )}
            </Card>
          )}

          {/* Auth Form */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
              <CardDescription>
                {isLogin
                  ? "Sign in to your account to access your matches"
                  : "Join FriendFinder to find your perfect friend matches"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field (signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="pl-10"
                        disabled={loading || savingResults}
                      />
                    </div>
                    {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10"
                      disabled={loading || savingResults}
                    />
                  </div>
                  {formErrors.email && <p className="text-sm text-red-600">{formErrors.email}</p>}
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10"
                      disabled={loading || savingResults}
                    />
                  </div>
                  {formErrors.password && <p className="text-sm text-red-600">{formErrors.password}</p>}
                </div>

                {/* Confirm Password field (signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="pl-10"
                        disabled={loading || savingResults}
                      />
                    </div>
                    {formErrors.confirmPassword && <p className="text-sm text-red-600">{formErrors.confirmPassword}</p>}
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={loading || savingResults || resultsSaved}>
                  {loading || savingResults ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loading 
                        ? (isLogin ? "Signing In..." : "Creating Account...")
                        : "Saving Results..."
                      }
                    </>
                  ) : resultsSaved ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Success! Redirecting...
                    </>
                  ) : (
                    <>{isLogin ? "Sign In" : "Create Account"}</>
                  )}
                </Button>
              </form>

              {/* Toggle between login/signup */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-1 p-0 h-auto font-semibold"
                    disabled={loading || savingResults}
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}