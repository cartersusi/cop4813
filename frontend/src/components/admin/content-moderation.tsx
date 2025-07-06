"use client"

import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Alert, AlertDescription } from "../../components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { Textarea } from "../../components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Search, Plus, Edit, Trash2, Eye, Flag, Loader2 } from "lucide-react"

interface Post {
  id: number
  title: string
  body?: string
  user_id: number
  username: string
  status: string
  visibility: string
  created_at: string
  updated_at: string
  is_flagged: boolean
}

interface PostDetail extends Post {
  user_email: string
  flag_reason?: string
  flagged_by?: number
  flagged_at?: string
}

export function ContentModeration() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showFlagDialog, setShowFlagDialog] = useState(false)

  const [newPost, setNewPost] = useState({
    title: "",
    body: "",
    user_id: 1,
    status: "published",
    visibility: "public",
  })

  const [editPost, setEditPost] = useState({
    title: "",
    body: "",
    status: "",
    visibility: "",
  })

  const [flagReason, setFlagReason] = useState("")

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (flaggedOnly) params.append("flagged_only", "true")

      const response = await fetch(`/api/admin/posts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch posts")

      const data = await response.json()
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchPostDetail = async (postId: number) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch post details")

      const data = await response.json()
      setSelectedPost(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleCreatePost = async () => {
    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify(newPost),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to create post")
      }

      setShowCreateDialog(false)
      setNewPost({
        title: "",
        body: "",
        user_id: 1,
        status: "published",
        visibility: "public",
      })
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleUpdatePost = async () => {
    if (!selectedPost) return

    try {
      const response = await fetch(`/api/admin/posts/${selectedPost.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify(editPost),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to update post")
      }

      setShowEditDialog(false)
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleFlagPost = async () => {
    if (!selectedPost || !flagReason) return

    try {
      const response = await fetch(`/api/admin/posts/${selectedPost.id}/flag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
        body: JSON.stringify({ reason: flagReason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to flag post")
      }

      setShowFlagDialog(false)
      setFlagReason("")
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_id")}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to delete post")
      }

      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const openEditDialog = (post: Post) => {
    setEditPost({
      title: post.title,
      body: post.body || "",
      status: post.status,
      visibility: post.visibility,
    })
    setSelectedPost(post as PostDetail)
    setShowEditDialog(true)
  }

  const openDetailDialog = async (post: Post) => {
    await fetchPostDetail(post.id)
    setShowDetailDialog(true)
  }

  const openFlagDialog = (post: Post) => {
    setSelectedPost(post as PostDetail)
    setShowFlagDialog(true)
  }

  useEffect(() => {
    fetchPosts()
  }, [searchTerm, statusFilter, flaggedOnly])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      case "deleted":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "bg-blue-100 text-blue-800"
      case "friends":
        return "bg-purple-100 text-purple-800"
      case "private":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600">Review and moderate user-generated content</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>Add new content to the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="body">Content</Label>
                <Textarea
                  id="body"
                  value={newPost.body}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newPost.status} onValueChange={(value) => setNewPost({ ...newPost, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={newPost.visibility}
                    onValueChange={(value) => setNewPost({ ...newPost, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePost}>Create Post</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Posts</Label>
              <Input
                id="search"
                placeholder="Search by title or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="flagged">Show Flagged Only</Label>
              <Select
                value={flaggedOnly ? "true" : "false"}
                onValueChange={(value) => setFlaggedOnly(value === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">All Posts</SelectItem>
                  <SelectItem value="true">Flagged Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchPosts} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{post.body?.substring(0, 100)}...</div>
                      </div>
                    </TableCell>
                    <TableCell>{post.username}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getVisibilityColor(post.visibility)}>{post.visibility}</Badge>
                    </TableCell>
                    <TableCell>
                      {post.is_flagged ? (
                        <Badge className="bg-red-100 text-red-800">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Clean</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetailDialog(post)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(post)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openFlagDialog(post)}>
                          <Flag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Post Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Update post content and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Title</Label>
              <Input
                id="edit_title"
                value={editPost.title}
                onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_body">Content</Label>
              <Textarea
                id="edit_body"
                value={editPost.body}
                onChange={(e) => setEditPost({ ...editPost, body: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editPost.status} onValueChange={(value) => setEditPost({ ...editPost, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_visibility">Visibility</Label>
                <Select
                  value={editPost.visibility}
                  onValueChange={(value) => setEditPost({ ...editPost, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePost}>Update Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Title</h4>
                <p>{selectedPost.title}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedPost.body}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Author Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Username:</span> {selectedPost.username}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedPost.user_email}
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span> {selectedPost.user_id}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Post Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <Badge className={getStatusColor(selectedPost.status)}>{selectedPost.status}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Visibility:</span>{" "}
                      <Badge className={getVisibilityColor(selectedPost.visibility)}>{selectedPost.visibility}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(selectedPost.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {new Date(selectedPost.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {selectedPost.is_flagged && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Flag Information</h4>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium">Reason:</span> {selectedPost.flag_reason}
                      </div>
                      <div>
                        <span className="font-medium">Flagged By:</span> User ID {selectedPost.flagged_by}
                      </div>
                      <div>
                        <span className="font-medium">Flagged At:</span>{" "}
                        {selectedPost.flagged_at ? new Date(selectedPost.flagged_at).toLocaleString() : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Post Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flag Post</DialogTitle>
            <DialogDescription>Report this post for inappropriate content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="flag_reason">Reason for flagging</Label>
              <Textarea
                id="flag_reason"
                placeholder="Describe why this post should be flagged..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFlagPost} className="bg-red-600 hover:bg-red-700">
              Flag Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
