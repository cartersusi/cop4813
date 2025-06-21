export interface QuizQuestion {
  id: number
  text: string
  options: QuizOption[]
  factor: "extraversion" | "agreeableness" | "conscientiousness" | "emotional_stability" | "intellect_imagination"
  correlation: "+" | "-"
}

export interface QuizOption {
  id: string
  text: string
  value: number
}

export interface QuizAnswer {
  questionId: number
  selectedOption: string
  value: number
}

export interface QuizState {
  currentQuestion: number
  answers: QuizAnswer[]
  isComplete: boolean
}

export interface PersonalityScores {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  emotional_stability: number
  intellect_imagination: number
}
