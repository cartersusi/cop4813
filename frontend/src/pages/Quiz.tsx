"use client"

import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Label } from "../components/ui/label"
import { Users, ChevronLeft, ChevronRight } from "lucide-react"
import { QUIZ_QUESTIONS } from "../data/quiz-questions"
import { useQuiz } from "../hooks/use-quiz"
import ResultsPage from "./Results"
import { calculatePersonalityScores } from "../lib/calculate-scores"


export default function QuizPage() {
  const {
    quizState,
    currentQuestion,
    progress,
    isFirstQuestion,
    isLastQuestion,
    getCurrentAnswer,
    saveAnswer,
    goToNext,
    goToPrevious,
    resetQuiz,
  } = useQuiz(QUIZ_QUESTIONS)

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return

    const selectedOption = currentQuestion.options.find((option) => option.id === value)
    if (selectedOption) {
      saveAnswer(selectedOption.id, selectedOption.value)
    }
  }

  const handleNext = () => {
    goToNext()
  }

  const handlePrevious = () => {
    goToPrevious()
  }

  const currentAnswer = getCurrentAnswer()
  const canProceed = currentAnswer !== undefined

  if (quizState.isComplete) {
    const personalityScores = calculatePersonalityScores(quizState.answers, QUIZ_QUESTIONS)

    return (
      <ResultsPage
        scores={personalityScores}
        onSignUp={() => {
          // TODO: Navigate to sign up page
          console.log("Navigate to sign up")
        }}
        onRetakeQuiz={resetQuiz}
      />
    )
  }

  if (!currentQuestion) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">FriendFinder</h1>
          </div>
          <div className="text-sm text-gray-600">
            Question {quizState.currentQuestion + 1} of {QUIZ_QUESTIONS.length}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="container mx-auto px-4 mb-8">
        <div className="max-w-4xl mx-auto">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>{Math.round(progress)}% Complete</span>
            <span>{QUIZ_QUESTIONS.length - quizState.currentQuestion - 1} questions remaining</span>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
                  {currentQuestion.factor.replace("_", " ").charAt(0).toUpperCase() +
                    currentQuestion.factor.replace("_", " ").slice(1)}{" "}
                  Factor
                </div>
                <div className="text-sm text-gray-500">#{currentQuestion.id}</div>
              </div>
              <CardTitle className="text-2xl leading-relaxed">{currentQuestion.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={currentAnswer?.selectedOption || ""}
                onValueChange={handleAnswerChange}
                className="space-y-4"
              >
                {currentQuestion.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 text-base cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                <div className="text-sm text-gray-500">
                  {canProceed ? "Ready to continue" : "Please select an answer"}
                </div>

                <Button onClick={handleNext} disabled={!canProceed} className="flex items-center space-x-2">
                  <span>{isLastQuestion ? "Complete" : "Next"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Info */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              This assessment is designed to identify your natural talents and strengths. Answer honestly based on your
              instincts and preferences.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
