"use client"

import { useState } from "react"
import { Menu, X, User, LogOut, Settings, Users, Home, Brain, UserPlus } from "lucide-react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { useAuth } from "../hooks/use-auth"
import { useToast } from "../hooks/use-toast"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Take Quiz", href: "/quiz", icon: Brain },
  { name: "Find Friends", href: "/discover", icon: Users },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, loading } = useAuth()
  const { toast } = useToast()

  const handleLogout = async () => {
    await logout()
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
      variant: "default",
    })
    setMobileMenuOpen(false)
    window.location.href = "/"
  }

  const getUserInitials = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase()
    }
    if (user?.first_name) {
        return user.first_name[0].toUpperCase()
    }
    if (user?.last_name) {
        return user.last_name[0].toUpperCase()
    }
    
    return "Me"
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-4">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Friend Finder</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </a>
              )
            })}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage/>
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href={`/user/${user.id}`} className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex md:items-center md:space-x-2">
                <Button variant="ghost" asChild>
                  <a href="/auth">Sign In</a>
                </Button>
                <Button asChild>
                  <a href="/auth">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </a>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </a>
                )
              })}

              {!user && (
                <div className="space-y-2 pt-4">
                  <a
                    href="/auth"
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </a>
                  <a
                    href="/auth"
                    className="block rounded-md bg-blue-600 px-3 py-2 text-base font-medium text-white hover:bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </a>
                </div>
              )}

              {user && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage/>
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                      </div>
                      <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <a
                      href={`/user/${user.id}`}
                      className="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="mr-3 h-5 w-5" />
                      Profile
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="mr-3 h-5 w-5" />
                      Settings
                    </a>
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileMenuOpen(false)
                      }}
                      className="flex w-full items-center rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
