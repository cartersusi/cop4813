"use client"

import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Users, Share2, UserPlus, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import type { PersonalityScores } from "../types/quiz"
import { formatFactorName, getPersonalityDescription } from "../lib/calculate-scores"

interface ResultsPageProps {
  scores: PersonalityScores
  onSignUp: () => void
  onRetakeQuiz: () => void
}

export default function Results({ scores, onSignUp, onRetakeQuiz }: ResultsPageProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const resultsText = `My Big 5 Personality Results from FriendFinder:

🎯 Extraversion: ${scores.extraversion}%
🤝 Agreeableness: ${scores.agreeableness}%
📋 Conscientiousness: ${scores.conscientiousness}%
😌 Emotional Stability: ${scores.emotional_stability}%
🧠 Intellect/Imagination: ${scores.intellect_imagination}%

Take the quiz yourself: ${window.location.origin}/quiz`

    try {
      await navigator.clipboard.writeText(resultsText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy to clipboard:", err)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-500"
    if (score >= 50) return "bg-blue-500"
    if (score >= 25) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getScoreLevel = (score: number) => {
    if (score >= 75) return "Very High"
    if (score >= 50) return "High"
    if (score >= 25) return "Low"
    return "Very Low"
  }

  const factorIcons = {
    extraversion: "🎯",
    agreeableness: "🤝",
    conscientiousness: "📋",
    emotional_stability: "😌",
    intellect_imagination: "🧠",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">FriendFinder</h1>
        </div>
      </header>

      {/* Results Content */}
      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Personality Profile</h2>
              <p className="text-xl text-gray-600">
                Based on the Big 5 personality model, here's what makes you unique
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Button onClick={handleShare} variant="outline" className="flex items-center space-x-2">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? "Copied!" : "Share Results"}</span>
              </Button>
              <Button onClick={onSignUp} className="flex items-center space-x-2">
                <UserPlus className="h-4 w-4" />
                <span>Sign Up & Save Results</span>
              </Button>
            </div>
          </div>

          {/* Personality Scores */}
          <div className="grid gap-6 mb-12">
            {(Object.keys(scores) as Array<keyof PersonalityScores>).map((factor) => (
              <Card key={factor} className="border-0 shadow-lg bg-white/90 backdrop-blur">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center space-x-3">
                      <span className="text-2xl">{factorIcons[factor]}</span>
                      <span>{formatFactorName(factor)}</span>
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{scores[factor]}%</div>
                      <div className="text-sm text-gray-600">{getScoreLevel(scores[factor])}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={scores[factor]} className="h-3" />
                  <CardDescription className="text-base leading-relaxed">
                    {getPersonalityDescription(factor, scores[factor])}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Card */}
          <Card className="border-0 shadow-lg bg-indigo-600 text-white mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">What This Means for You</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg opacity-90">
                Your unique personality profile helps us match you with compatible friends who complement your traits
                and share your values. People with similar profiles often form strong, lasting friendships.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Best Matches</h4>
                  <p className="text-sm opacity-90">
                    We'll connect you with people who have complementary personality traits for balanced friendships.
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Growth Opportunities</h4>
                  <p className="text-sm opacity-90">
                    Meet people who can help you develop in areas where you'd like to grow and improve.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">Ready to Find Your Perfect Matches?</h3>
            <p className="text-gray-600 mb-6">
              Sign up to save your results and start connecting with compatible friends in your area.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={onSignUp} className="text-lg px-8 py-4">
                Create Your Profile
              </Button>
              <Button size="lg" variant="outline" onClick={onRetakeQuiz}>
                Retake Quiz
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
