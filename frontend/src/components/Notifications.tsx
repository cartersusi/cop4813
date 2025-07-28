import React, { useState, useEffect } from 'react';
import { Bell, UserPlus, Check, X, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Toast } from './ui/toast';

// Types
interface FriendRequest {
  id: number;
  user_id: number;
  friend_user_id: number;
  status: 'pending' | 'accepted' | 'blocked';
  requested_by: number;
  created_at: string;
  updated_at: string;
  requester?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface FriendRequestNotificationProps {
  user: any; // Your user type
}

// Main Notification Component
export const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({ user }) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch pending friend requests
  const fetchFriendRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/friends/requests/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (requestId: number) => {
    try {
      const request = friendRequests.find(r => r.id === requestId);
      if (!request) return;

      const response = await fetch(`/api/friends/accept/${request.requested_by}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from pending requests
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Show success toast
        Toast({
          title: "Friend request accepted!",
          content: `You are now friends with ${request.requester?.first_name || request.requester?.username || 'this user'}.`,
          variant: "default"
        });
      } else {
        throw new Error('Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Toast({
        title: "Error",
        content: "Failed to accept friend request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId: number) => {
    try {
      const request = friendRequests.find(r => r.id === requestId);
      if (!request) return;

      const response = await fetch(`/api/friends/decline/${request.requested_by}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from pending requests
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Show success toast
        Toast({
          title: "Friend request declined",
          content: "The friend request has been declined.",
          variant: "default"
        });
      } else {
        throw new Error('Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Toast({
        title: "Error",
        content: "Failed to decline friend request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Real-time polling for new friend requests
  useEffect(() => {
    if (user) {
      fetchFriendRequests();
      
      // Poll for new requests every 30 seconds
      const interval = setInterval(fetchFriendRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Show toast notification for new friend requests
  useEffect(() => {
    friendRequests.forEach(request => {
      // Check if this is a new request (created within last minute)
      const createdAt = new Date(request.created_at);
      const now = new Date();
      const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      if (diffInMinutes <= 1) {
        // Show toast for new requests
        const requesterName = request.requester
          ? `${request.requester.first_name || ''} ${request.requester.last_name || ''}`.trim() || request.requester.username
          : 'Someone';
          
          Toast({
          title: "New friend request!",
          variant: "default",
          content: `${requesterName} wants to be friends with you.`
        });
      }
    });
  }, [friendRequests]);

  const getRequesterName = (request: FriendRequest) => {
    if (!request.requester) return 'Unknown User';
    return `${request.requester.first_name || ''} ${request.requester.last_name || ''}`.trim() || request.requester.username;
  };

  const getRequesterInitials = (request: FriendRequest) => {
    const name = getRequesterName(request);
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {friendRequests.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {friendRequests.length > 9 ? '9+' : friendRequests.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Friend Requests</span>
          {friendRequests.length > 0 && (
            <Badge variant="secondary">{friendRequests.length}</Badge>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : friendRequests.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No pending friend requests
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {friendRequests.map((request) => (
              <DropdownMenuItem key={request.id} className="p-0">
                <div className="flex items-center space-x-3 p-3 w-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.requester?.avatar_url} />
                    <AvatarFallback>{getRequesterInitials(request)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getRequesterName(request)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptRequest(request.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeclineRequest(request.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        {friendRequests.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/friends" className="flex items-center justify-center w-full text-sm">
                <Users className="mr-2 h-4 w-4" />
                View All Friends
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Demo Component showing how to integrate
export const FriendRequestDemo = () => {
  // Mock user data for demo
  const mockUser = {
    id: "1",
    email: "user@example.com",
    name: "John Doe",
    first_name: "John",
    last_name: "Doe"
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Friend Request Notification System</h1>
        
        {/* Demo Header */}
        <div className="bg-white shadow-sm border-b mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-bold">Friend Finder</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <FriendRequestNotification user={mockUser} />
                
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Demo Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Integration Instructions</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">1. Add to your Header component:</h3>
              <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`import { FriendRequestNotification } from './FriendRequestNotification';

// In your Header component, add this next to the user avatar:
<FriendRequestNotification user={user} />`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">2. Required Backend Endpoints:</h3>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>GET /api/friends/requests/pending</code> - Get pending friend requests</li>
                <li><code>POST /api/friends/accept/{`{user_id}`}</code> - Accept friend request</li>
                <li><code>DELETE /api/friends/decline/{`{user_id}`}</code> - Decline friend request</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium">3. Features:</h3>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time badge showing number of pending requests</li>
                <li>Dropdown with detailed friend request list</li>
                <li>Accept/decline buttons with instant feedback</li>
                <li>Toast notifications for new requests and actions</li>
                <li>Automatic polling for new requests every 30 seconds</li>
                <li>Responsive design that works on mobile and desktop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequestDemo;