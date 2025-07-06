export interface UserStats {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    newUsersToday: number
    newUsersThisWeek: number
    newUsersThisMonth: number
  }
  
  export interface ActivityStats {
    totalPosts: number
    totalFriendRequests: number
    totalPersonalityTests: number
    completionRate: number
    matchingRate: number
  }
  
  export interface PostCategoryStats {
    category: string
    count: number
    percentage: number
  }
  
  export interface TimeSeriesData {
    date: string
    users: number
    posts: number
    tests: number
  }
  
  export interface TopFeatures {
    feature: string
    usage: number
    percentage: number
  }
  
  export interface AdminFilters {
    dateRange: {
      start: string
      end: string
    }
    userRole?: string
    category?: string
  }
  
  export interface DashboardData {
    userStats: UserStats
    activityStats: ActivityStats
    postCategories: PostCategoryStats[]
    timeSeriesData: TimeSeriesData[]
    topFeatures: TopFeatures[]
    personalityDistribution: {
      trait: string
      average: number
      count: number
    }[]
  }
  