import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Users, Heart, Zap, Target, ArrowRight } from "lucide-react"

export default function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">FriendFinder</h1>
          </div>
          <Button variant="outline">About</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Find Friends Through Your
            <span className="text-indigo-600 block">Unique Strengths</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover meaningful connections by taking the Clifton Strengths Assessment. We'll match you with like-minded
            people who share your natural talents and complement your growth.
          </p>
          <Button size="lg" className="text-lg px-8 py-4">
            <a href="quiz">Take the Assessment</a>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-gray-500 mt-3">No signup required • Takes 10-15 minutes</p>
        </div>

        {/* How It Works */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">1. Discover Your Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Take our comprehensive assessment based on Clifton Strengths to identify your top natural talents and
                  abilities.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">2. Get Matched</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our algorithm finds people with complementary strengths and similar values for meaningful connections.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle className="text-xl">3. Build Friendships</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Connect with your matches and build lasting friendships based on mutual understanding and growth.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* About Clifton Strengths */}
        <section className="mb-16">
          <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-900">About Clifton Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 text-center max-w-3xl mx-auto">
                The Clifton Strengths Assessment identifies your unique combination of 34 talent themes. These themes
                represent your natural patterns of thinking, feeling, and behaving that can be productively applied in
                your relationships and personal growth.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Four Domains:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>
                        <strong>Executing:</strong> Making things happen
                      </span>
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span>
                        <strong>Influencing:</strong> Taking charge and speaking up
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 md:opacity-0">Domains:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span>
                        <strong>Relationship Building:</strong> Connecting with others
                      </span>
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <span>
                        <strong>Strategic Thinking:</strong> Analyzing and planning
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-indigo-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Find Your Tribe?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of people who've discovered meaningful friendships through their strengths.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
            <a href="quiz">Start Your Assessment Now</a>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <div className="flex justify-center items-center space-x-8 mt-8 text-sm opacity-75">
            <span>✓ 100% Free</span>
            <span>✓ No Email Required</span>
            <span>✓ Instant Results</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 FriendFinder. Built with care for meaningful connections.</p>
        </div>
      </footer>
    </div>
  )
}
