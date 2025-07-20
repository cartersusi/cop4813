export interface UserProfile {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
    bio?: string
    avatar_url?: string
    is_active: boolean
    created_at: string
    friend_count: number
    post_count: number
    personality_results?: {
      extraversion: number
      agreeableness: number
      conscientiousness: number
      emotional_stability: number
      intellect_imagination: number
    }
  }