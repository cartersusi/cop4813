"use client"

import { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Input } from "../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { 
  Users, 
  Brain, 
  Heart, 
  Search,
  UserPlus,
  Filter,
  Loader2,
  Target,
  TrendingUp,
  ArrowRight,
  Star,
  Calendar
} from "lucide-react"
import { useAuth } from "../hooks/use-auth"
import { formatFactorName } from "../lib/calculate-scores"
import type { PersonalityScores } from "../types/quiz"

interface CompatibleUser {
  id: number
  username: string
  first_name?: string
  last_name?: string
  bio?: string
  avatar_url?: string
  created_at: string
  personality_results: PersonalityScores
  compatibility_score: number
  distance: number
  friend_status: "none" | "pending" | "accepted" | "blocked"
  mutual_friends: number
}

interface DiscoverFilters {
  ageRange: string
  location: string
  compatibility: string
  interests: string
}

export default function Discover() {
  const { user, loading } = useAuth()
  const [compatibleUsers, setCompatibleUsers] = useState<CompatibleUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<DiscoverFilters>({
    ageRange: "all",
    location: "all",
    compatibility: "all",
    interests: "all"
  })
  const [showFilters, setShowFilters] = useState(false)

  const USERS_PER_PAGE = 100

  const fetchCompatibleUsers = async (page: number = 1, reset: boolean = false) => {
    if (!user) return

    try {
      setSearchLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: USERS_PER_PAGE.toString(),
      })

      if (searchQuery) params.append("search", searchQuery)
      if (filters.ageRange !== "all") params.append("age_range", filters.ageRange)
      if (filters.location !== "all") params.append("location", filters.location)
      if (filters.compatibility !== "all") params.append("min_compatibility", filters.compatibility)
      if (filters.interests !== "all") params.append("interests", filters.interests)

      const response = await fetch(`/api/discover/compatible-users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch compatible users")
      }

      const data = await response.json()
      
      if (reset || page === 1) {
        setCompatibleUsers(data.users)
      } else {
        setCompatibleUsers(prev => [...prev, ...data.users])
      }
      
      setHasMore(data.has_more)
      setCurrentPage(page)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compatible users")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearch = () => {
    fetchCompatibleUsers(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !searchLoading) {
      fetchCompatibleUsers(currentPage + 1, false)
    }
  }

  const handleFilterChange = (filterType: keyof DiscoverFilters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }))
  }

  const applyFilters = () => {
    fetchCompatibleUsers(1, true)
    setShowFilters(false)
  }

  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify({ friend_user_id: userId }),
      })

      if (response.ok) {
        // Update the user's friend status in the list
        setCompatibleUsers(prev => 
          prev.map(u => 
            u.id === userId 
              ? { ...u, friend_status: "pending" }
              : u
          )
        )
      }
    } catch (err) {
      console.error("Error sending friend request:", err)
    }
  }

  useEffect(() => {
    if (user) {
      fetchCompatibleUsers(1, true)
    }
  }, [user])

  const getFullName = (user: CompatibleUser) => {
    const parts = []
    if (user.first_name) parts.push(user.first_name)
    if (user.last_name) parts.push(user.last_name)
    return parts.length > 0 ? parts.join(" ") : user.username
  }

  const getInitials = (user: CompatibleUser) => {
    const name = getFullName(user)
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getCompatibilityLevel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-green-500" }
    if (score >= 80) return { label: "Very Good", color: "bg-blue-500" }
    if (score >= 70) return { label: "Good", color: "bg-yellow-500" }
    if (score >= 60) return { label: "Fair", color: "bg-orange-500" }
    return { label: "Low", color: "bg-red-500" }
  }

  const getFriendButtonConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Request Sent", disabled: true, variant: "secondary" as const }
      case "accepted":
        return { text: "Friends", disabled: true, variant: "secondary" as const }
      case "blocked":
        return { text: "Blocked", disabled: true, variant: "destructive" as const }
      default:
        return { text: "Add Friend", disabled: false, variant: "default" as const }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <div className="mb-8">
              <Users className="h-20 w-20 text-indigo-600 mx-auto mb-6" />
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Discover Your
                <span className="text-indigo-600 block">Perfect Matches</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Find meaningful connections with people who share your personality traits and complement your strengths. 
                Our advanced matching algorithm analyzes personality compatibility to suggest the best friend matches for you.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Brain className="h-8 w-8 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl">Take the Assessment First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-6">
                    Complete our personality assessment to unlock personalized friend recommendations 
                    based on compatibility and shared interests.
                  </CardDescription>
                  <Button size="lg" className="w-full" onClick={() => window.location.href = '/quiz'}>
                    <Brain className="mr-2 h-5 w-5" />
                    Start Assessment
                  </Button>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Already Have Results?</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-6">
                    Sign in to your account to access your personality profile and 
                    start discovering compatible friends in your area.
                  </CardDescription>
                  <Button size="lg" variant="outline" className="w-full" onClick={() => window.location.href = '/auth'}>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Matching</h3>
                <p className="text-gray-600">Our algorithm analyzes personality compatibility to find your ideal matches</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Meaningful Connections</h3>
                <p className="text-gray-600">Build lasting friendships based on shared values and complementary traits</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Personal Growth</h3>
                <p className="text-gray-600">Connect with people who can help you grow and develop new perspectives</p>
              </div>
            </div>

            {/* CTA Section */}
            <Card className="bg-indigo-600 text-white border-0 shadow-lg max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Ready to Find Your Tribe?</h3>
                <p className="text-lg mb-6 opacity-90">
                  Join thousands of people who've found meaningful friendships through personality compatibility.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" onClick={() => window.location.href = '/quiz'}>
                    Take Assessment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-indigo-600" onClick={() => window.location.href = '/auth'}>
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Logged in state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Friends</h1>
              <p className="text-gray-600">Find people who match your personality and interests</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {compatibleUsers.length} matches found
            </Badge>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-6">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or interests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              {/* Search Button */}
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Age Range</label>
                    <Select value={filters.ageRange} onValueChange={(value) => handleFilterChange("ageRange", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ages</SelectItem>
                        <SelectItem value="18-25">18-25</SelectItem>
                        <SelectItem value="26-35">26-35</SelectItem>
                        <SelectItem value="36-45">36-45</SelectItem>
                        <SelectItem value="46+">46+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={filters.location} onValueChange={(value) => handleFilterChange("location", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="nearby">Nearby (50 miles)</SelectItem>
                        <SelectItem value="city">Same City</SelectItem>
                        <SelectItem value="state">Same State</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Compatibility</label>
                    <Select value={filters.compatibility} onValueChange={(value) => handleFilterChange("compatibility", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="90">Excellent (90%+)</SelectItem>
                        <SelectItem value="80">Very Good (80%+)</SelectItem>
                        <SelectItem value="70">Good (70%+)</SelectItem>
                        <SelectItem value="60">Fair (60%+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Interests</label>
                    <Select value={filters.interests} onValueChange={(value) => handleFilterChange("interests", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Interests</SelectItem>
                        <SelectItem value="creative">Creative Arts</SelectItem>
                        <SelectItem value="sports">Sports & Fitness</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="books">Books & Learning</SelectItem>
                        <SelectItem value="travel">Travel & Adventure</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={applyFilters}>Apply Filters</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-8">
            <CardContent className="p-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {compatibleUsers.map((compatibleUser) => {
            const compatibility = getCompatibilityLevel(compatibleUser.compatibility_score)
            const friendButton = getFriendButtonConfig(compatibleUser.friend_status)

            return (
              <Card key={compatibleUser.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={compatibleUser.avatar_url} alt={getFullName(compatibleUser)} />
                        <AvatarFallback>{getInitials(compatibleUser)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{getFullName(compatibleUser)}</CardTitle>
                        <CardDescription>@{compatibleUser.username}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-semibold">{compatibleUser.compatibility_score}%</span>
                      </div>
                      <Badge className={`${compatibility.color} text-white text-xs`}>
                        {compatibility.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Bio */}
                  {compatibleUser.bio && (
                    <p className="text-sm text-gray-700 line-clamp-2">{compatibleUser.bio}</p>
                  )}

                  {/* Compatibility Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Compatibility</span>
                      <span>{compatibleUser.compatibility_score}%</span>
                    </div>
                    <Progress value={compatibleUser.compatibility_score} className="h-2" />
                  </div>

                  {/* Personality Traits Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(compatibleUser.personality_results)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([trait, score]) => (
                          <Badge key={trait} variant="outline" className="text-xs">
                            {formatFactorName(trait as keyof PersonalityScores)}: {score}%
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Mutual Friends */}
                  {compatibleUser.mutual_friends > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{compatibleUser.mutual_friends} mutual friends</span>
                    </div>
                  )}

                  {/* Member Since */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {new Date(compatibleUser.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={friendButton.variant}
                      size="sm"
                      disabled={friendButton.disabled}
                      onClick={() => !friendButton.disabled && sendFriendRequest(compatibleUser.id)}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {friendButton.text}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/user/${compatibleUser.id}`}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={handleLoadMore}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Load More Matches
            </Button>
          </div>
        )}

        {/* No Results */}
        {!searchLoading && compatibleUsers.length === 0 && (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Matches Found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search filters or check back later for new members.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("")
                setFilters({
                  ageRange: "all",
                  location: "all", 
                  compatibility: "all",
                  interests: "all"
                })
                fetchCompatibleUsers(1, true)
              }}>
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}