export interface QuizQuestion {
    id: number
    text: string
    options: QuizOption[]
    domain: "executing" | "influencing" | "relationship" | "strategic"
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
  