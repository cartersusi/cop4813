import type { QuizAnswer, PersonalityScores, QuizQuestion } from "../types/quiz"

export function calculatePersonalityScores(answers: QuizAnswer[], questions: QuizQuestion[]): PersonalityScores {
  const scores: PersonalityScores = {
    extraversion: 0,
    agreeableness: 0,
    conscientiousness: 0,
    emotional_stability: 0,
    intellect_imagination: 0,
  }

  const factorCounts = {
    extraversion: 0,
    agreeableness: 0,
    conscientiousness: 0,
    emotional_stability: 0,
    intellect_imagination: 0,
  }

  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === answer.questionId)
    if (!question) return

    let adjustedScore = answer.value

    // Reverse score for negative correlations
    if (question.correlation === "-") {
      adjustedScore = 6 - answer.value // Convert 1-5 scale to 5-1
    }

    scores[question.factor] += adjustedScore
    factorCounts[question.factor] += 1
  })

  // Calculate averages and convert to percentages
  Object.keys(scores).forEach((factor) => {
    const key = factor as keyof PersonalityScores
    if (factorCounts[key] > 0) {
      const average = scores[key] / factorCounts[key]
      scores[key] = Math.round(((average - 1) / 4) * 100) // Convert 1-5 scale to 0-100%
    }
  })

  return scores
}

export function getPersonalityDescription(factor: keyof PersonalityScores, score: number): string {
  const descriptions = {
    extraversion: {
      high: "You're outgoing, energetic, and enjoy being around people. You tend to be talkative and assertive in social situations.",
      low: "You prefer quieter environments and smaller groups. You're more reserved and thoughtful in your interactions.",
    },
    agreeableness: {
      high: "You're compassionate, cooperative, and trusting. You value harmony and are considerate of others' feelings.",
      low: "You're more competitive and skeptical. You tend to be direct and focus on your own interests.",
    },
    conscientiousness: {
      high: "You're organized, responsible, and goal-oriented. You plan ahead and follow through on commitments.",
      low: "You're more spontaneous and flexible. You prefer to go with the flow rather than stick to rigid plans.",
    },
    emotional_stability: {
      high: "You're calm, resilient, and handle stress well. You tend to stay composed under pressure.",
      low: "You're more sensitive to stress and may experience anxiety more frequently. You feel emotions deeply.",
    },
    intellect_imagination: {
      high: "You're curious, creative, and enjoy exploring new ideas. You appreciate art, beauty, and intellectual discussions.",
      low: "You prefer practical, concrete thinking. You focus on real-world applications rather than abstract concepts.",
    },
  }

  return score >= 50 ? descriptions[factor].high : descriptions[factor].low
}

export function formatFactorName(factor: keyof PersonalityScores): string {
  const names = {
    extraversion: "Extraversion",
    agreeableness: "Agreeableness",
    conscientiousness: "Conscientiousness",
    emotional_stability: "Emotional Stability",
    intellect_imagination: "Intellect/Imagination",
  }
  return names[factor]
}
