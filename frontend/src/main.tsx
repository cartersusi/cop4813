import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.tsx'
import Auth from './pages/Auth.tsx'
//import About from './pages/About.tsx'
//import Contact from './pages/Contact.tsx'
import Quiz from './pages/Quiz.tsx'
import Admin from './pages/Admin.tsx'
import UserProfile from './pages/Profile.tsx'
import Discover from './pages/Discover.tsx'
import { Header } from './components/Header.tsx'

//import User from './pages/User.tsx'
//import Match from './pages/Match.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/discover" element={<Discover />} />
        {/*
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/user/:userid" element={<User />} />
        <Route path="/match" element={<Match />} />
        */}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)