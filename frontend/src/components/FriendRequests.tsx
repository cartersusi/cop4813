// components/FriendRequestNotification.tsx - Complete component
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
import { useToast } from '../hooks/use-toast';

interface FriendRequest {
  id: string; // Composite ID in format "user_id_friend_user_id"
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
  user: any;
}

export const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({ user }) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

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

  const handleAcceptRequest = async (requestId: string) => {
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
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        
        const requesterName = request.requester?.first_name || request.requester?.username || 'this user';
        toast({
          title: "Friend request accepted!",
          description: `You are now friends with ${requesterName}.`,
          variant: "default"
        });
      } else {
        throw new Error('Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request.",
        variant: "destructive"
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
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
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        toast({
          title: "Friend request declined",
          description: "The friend request has been declined.",
          variant: "default"
        });
      } else {
        throw new Error('Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        title: "Error",
        description: "Failed to decline friend request.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
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
        const requesterName = getRequesterName(request);
          
        toast({
          title: "New friend request!",
          description: `${requesterName} wants to be friends with you.`,
          variant: "default",
          duration: 5000,
        });
      }
    });
  }, [friendRequests]);

  const getRequesterName = (request: FriendRequest) => {
    if (!request.requester) return 'Unknown User';
    const fullName = `${request.requester.first_name || ''} ${request.requester.last_name || ''}`.trim();
    return fullName || request.requester.username;
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
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : friendRequests.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No pending friend requests</div>
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
                      title="Accept friend request"
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
                      title="Decline friend request"
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