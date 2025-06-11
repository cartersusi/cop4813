"use client"

import { useState, useCallback } from "react"
import type { QuizState, QuizAnswer, QuizQuestion } from "../types/quiz"

export function useQuiz(questions: QuizQuestion[]) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    isComplete: false,
  })

  const currentQuestion = questions[quizState.currentQuestion]
  const progress = ((quizState.currentQuestion + 1) / questions.length) * 100
  const isFirstQuestion = quizState.currentQuestion === 0
  const isLastQuestion = quizState.currentQuestion === questions.length - 1

  const getCurrentAnswer = useCallback(() => {
    return quizState.answers.find((answer) => answer.questionId === currentQuestion?.id)
  }, [quizState.answers, currentQuestion?.id])

  const saveAnswer = useCallback(
    (selectedOption: string, value: number) => {
      if (!currentQuestion) return

      setQuizState((prev) => {
        const existingAnswerIndex = prev.answers.findIndex((answer) => answer.questionId === currentQuestion.id)

        const newAnswer: QuizAnswer = {
          questionId: currentQuestion.id,
          selectedOption,
          value,
        }

        let newAnswers
        if (existingAnswerIndex >= 0) {
          // Update existing answer
          newAnswers = [...prev.answers]
          newAnswers[existingAnswerIndex] = newAnswer
        } else {
          // Add new answer
          newAnswers = [...prev.answers, newAnswer]
        }

        return {
          ...prev,
          answers: newAnswers,
        }
      })
    },
    [currentQuestion],
  )

  const goToNext = useCallback(() => {
    if (isLastQuestion) {
      setQuizState((prev) => ({ ...prev, isComplete: true }))
    } else {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
      }))
    }
  }, [isLastQuestion])

  const goToPrevious = useCallback(() => {
    if (!isFirstQuestion) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1,
      }))
    }
  }, [isFirstQuestion])

  const resetQuiz = useCallback(() => {
    setQuizState({
      currentQuestion: 0,
      answers: [],
      isComplete: false,
    })
  }, [])

  return {
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
  }
}
