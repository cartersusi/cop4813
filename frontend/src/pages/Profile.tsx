"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { 
  Users, 
  Mail, 
  Calendar, 
  ArrowLeft,
  User,
  FileText,
  TrendingUp,
  UserPlus,
  MessageCircle,
  Loader2
} from "lucide-react"
import { useAuth } from "../hooks/use-auth"
import { formatFactorName } from "../lib/calculate-scores"
import type { UserProfile } from "../types/user"

interface Post {
  id: number
  title: string
  body?: string
  status: string
  visibility: string
  created_at: string
  updated_at: string
}

interface FriendStatus {
  status: "none" | "pending" | "accepted" | "blocked"
  requested_by?: number
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [friendStatus, setFriendStatus] = useState<FriendStatus>({ status: "none" })
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const isOwnProfile = user && profile && user.id === profile.id.toString()

  const fetchUserProfile = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user profile")
      }

      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    if (!userId) return

    try {
      setPostsLoading(true)
      const response = await fetch(`/api/users/${userId}/posts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user posts")
      }

      const data = await response.json()
      setPosts(data)
    } catch (err) {
      console.error("Error fetching posts:", err)
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchFriendStatus = async () => {
    if (!userId || isOwnProfile) return

    try {
      const response = await fetch(`/api/friends/status/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFriendStatus(data)
      }
    } catch (err) {
      console.error("Error fetching friend status:", err)
    }
  }

  const handleFriendRequest = async () => {
    if (!userId) return

    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify({ friend_user_id: parseInt(userId) }),
      })

      if (response.ok) {
        setFriendStatus({ status: "pending", requested_by: parseInt(user!.id) })
      }
    } catch (err) {
      console.error("Error sending friend request:", err)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [userId])

  useEffect(() => {
    if (profile) {
      fetchFriendStatus()
    }
  }, [profile, isOwnProfile])

  useEffect(() => {
    if (activeTab === "posts") {
      fetchUserPosts()
    }
  }, [activeTab, userId])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
  }

  const getFullName = (profile: UserProfile) => {
    const parts = []
    if (profile.first_name) parts.push(profile.first_name)
    if (profile.last_name) parts.push(profile.last_name)
    return parts.length > 0 ? parts.join(" ") : profile.username
  }

  const getPersonalityDescription = (factor: string, score: number): string => {
    const descriptions: Record<string, { high: string; low: string }> = {
      extraversion: {
        high: "Outgoing and energetic",
        low: "Reserved and thoughtful",
      },
      agreeableness: {
        high: "Compassionate and cooperative",
        low: "Competitive and direct",
      },
      conscientiousness: {
        high: "Organized and responsible",
        low: "Spontaneous and flexible",
      },
      emotional_stability: {
        high: "Calm and resilient",
        low: "Sensitive and emotionally aware",
      },
      intellect_imagination: {
        high: "Creative and curious",
        low: "Practical and concrete",
      },
    }

    return score >= 50 ? descriptions[factor]?.high : descriptions[factor]?.low
  }

  const getFriendButtonText = () => {
    switch (friendStatus.status) {
      case "pending":
        return friendStatus.requested_by === parseInt(user!.id) ? "Request Sent" : "Accept Request"
      case "accepted":
        return "Friends"
      case "blocked":
        return "Blocked"
      default:
        return "Add Friend"
    }
  }

  const getFriendButtonIcon = () => {
    switch (friendStatus.status) {
      case "accepted":
        return <Users className="h-4 w-4" />
      case "pending":
        return <UserPlus className="h-4 w-4" />
      default:
        return <UserPlus className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              {error || "The user profile you're looking for doesn't exist."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url} alt={getFullName(profile)} />
                  <AvatarFallback className="text-2xl font-bold bg-indigo-600 text-white">
                    {getInitials(getFullName(profile))}
                  </AvatarFallback>
                </Avatar>

                {/* Profile Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{getFullName(profile)}</h2>
                    <p className="text-lg text-gray-600">@{profile.username}</p>
                  </div>

                  {profile.bio && (
                    <p className="text-gray-700 max-w-2xl">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{profile.friend_count} friends</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{profile.post_count} posts</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleFriendRequest}
                        disabled={friendStatus.status === "accepted" || friendStatus.status === "blocked"}
                        variant={friendStatus.status === "accepted" ? "secondary" : "default"}
                      >
                        {getFriendButtonIcon()}
                        {getFriendButtonText()}
                      </Button>
                      <Button variant="outline">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="personality" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Personality
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Posts
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{isOwnProfile ? profile.email : "Email hidden"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Member since {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={profile.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {profile.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Friends</span>
                        <span className="text-sm font-bold">{profile.friend_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Posts</span>
                        <span className="text-sm font-bold">{profile.post_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Personality Test</span>
                        <Badge className={profile.personality_results ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {profile.personality_results ? "Completed" : "Not taken"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Personality Tab */}
            <TabsContent value="personality" className="space-y-6">
              {profile.personality_results ? (
                <div className="grid gap-6">
                  {Object.entries(profile.personality_results).map(([factor, score]) => (
                    <Card key={factor}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{formatFactorName(factor as any)}</CardTitle>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{score}%</div>
                            <div className="text-sm text-gray-600">
                              {score >= 75 ? "Very High" : score >= 50 ? "High" : score >= 25 ? "Low" : "Very Low"}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Progress value={score} className="h-3" />
                        <CardDescription className="text-base">
                          {getPersonalityDescription(factor, score)}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Personality Results</h3>
                    <p className="text-gray-600 mb-6">
                      {isOwnProfile 
                        ? "Take the personality assessment to see your results here."
                        : `${getFullName(profile)} hasn't taken the personality assessment yet.`
                      }
                    </p>
                    {isOwnProfile && (
                      <Button onClick={() => navigate("/quiz")}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Take Assessment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-6">
              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mr-2" />
                  <span className="text-gray-600">Loading posts...</span>
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{post.title}</CardTitle>
                            <CardDescription>
                              {new Date(post.created_at).toLocaleDateString()} •{" "}
                              <Badge variant="outline">{post.status}</Badge>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      {post.body && (
                        <CardContent>
                          <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
                    <p className="text-gray-600">
                      {isOwnProfile 
                        ? "You haven't created any posts yet."
                        : `${getFullName(profile)} hasn't shared any posts yet.`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}