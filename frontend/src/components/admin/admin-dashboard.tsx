"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Loader2, Users, Activity, TrendingUp, UserCheck, UserX, Calendar, Settings, FileText } from "lucide-react"
import { useAdminAuth } from "../../hooks/use-admin-auth"
import { StatsCard } from "./stats-card"
import { DashboardCharts } from "./dashboard-charts"
import { DashboardFilters } from "./dashboard-filters"
import { UserManagement } from "./user-management"
import { ContentModeration } from "./content-moderation"
import type { DashboardData, AdminFilters } from "../../types/admin"

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAdminAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [filters, setFilters] = useState<AdminFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
      end: new Date().toISOString().split("T")[0], // today
    },
  })

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.dateRange.start) params.append("startDate", filters.dateRange.start)
      if (filters.dateRange.end) params.append("endDate", filters.dateRange.end)
      if (filters.userRole) params.append("userRole", filters.userRole)
      if (filters.category) params.append("category", filters.category)

      const response = await fetch(`/api/admin/dashboard-data?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData()
    }
  }, [isAdmin])

  const handleApplyFilters = () => {
    fetchDashboardData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the admin dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Moderation
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Filters */}
            <DashboardFilters filters={filters} onFiltersChange={setFilters} onApplyFilters={handleApplyFilters} />

            {/* Error Alert */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {dataLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mr-2" />
                <span className="text-gray-600">Loading dashboard data...</span>
              </div>
            )}

            {/* Dashboard Content */}
            {dashboardData && !dataLoading && (
              <>
                {/* User Stats */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">User Statistics</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title="Total Users"
                      value={dashboardData.userStats.totalUsers.toLocaleString()}
                      description="Registered users"
                      icon={Users}
                      trend={{ value: 12.5, isPositive: true }}
                    />
                    <StatsCard
                      title="Active Users"
                      value={dashboardData.userStats.activeUsers.toLocaleString()}
                      description="Currently active"
                      icon={UserCheck}
                      trend={{ value: 8.2, isPositive: true }}
                    />
                    <StatsCard
                      title="Inactive Users"
                      value={dashboardData.userStats.inactiveUsers.toLocaleString()}
                      description="Inactive accounts"
                      icon={UserX}
                      trend={{ value: -3.1, isPositive: false }}
                    />
                    <StatsCard
                      title="New This Month"
                      value={dashboardData.userStats.newUsersThisMonth.toLocaleString()}
                      description="New registrations"
                      icon={Calendar}
                      trend={{ value: 15.7, isPositive: true }}
                    />
                  </div>
                </div>

                {/* Activity Overview */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Overview</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title="Total Posts"
                      value={dashboardData.activityStats.totalPosts.toLocaleString()}
                      description="User posts created"
                      icon={Activity}
                    />
                    <StatsCard
                      title="Friend Requests"
                      value={dashboardData.activityStats.totalFriendRequests.toLocaleString()}
                      description="Connection requests"
                      icon={Users}
                    />
                    <StatsCard
                      title="Personality Tests"
                      value={dashboardData.activityStats.totalPersonalityTests.toLocaleString()}
                      description="Tests completed"
                      icon={TrendingUp}
                    />
                    <StatsCard
                      title="Matching Rate"
                      value={`${dashboardData.activityStats.matchingRate}%`}
                      description="Successful matches"
                      icon={UserCheck}
                    />
                  </div>
                </div>

                {/* Charts and Visualizations */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Insights</h2>
                  <DashboardCharts
                    postCategories={dashboardData.postCategories}
                    timeSeriesData={dashboardData.timeSeriesData}
                    topFeatures={dashboardData.topFeatures}
                    personalityDistribution={dashboardData.personalityDistribution}
                  />
                </div>

                {/* Summary Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Health</CardTitle>
                      <CardDescription>Key performance indicators</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">User Engagement</span>
                        <span className="text-sm text-green-600 font-semibold">
                          {((dashboardData.userStats.activeUsers / dashboardData.userStats.totalUsers) * 100).toFixed(
                            1,
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Test Completion Rate</span>
                        <span className="text-sm text-blue-600 font-semibold">
                          {dashboardData.activityStats.completionRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Friend Matching Success</span>
                        <span className="text-sm text-purple-600 font-semibold">
                          {dashboardData.activityStats.matchingRate}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Metrics</CardTitle>
                      <CardDescription>Recent growth trends</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Daily New Users</span>
                        <span className="text-sm font-semibold">{dashboardData.userStats.newUsersToday}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Weekly Growth</span>
                        <span className="text-sm font-semibold">{dashboardData.userStats.newUsersThisWeek}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Growth</span>
                        <span className="text-sm font-semibold">{dashboardData.userStats.newUsersThisMonth}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="content">
            <ContentModeration />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">System settings panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
