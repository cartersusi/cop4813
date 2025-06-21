import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.tsx'
//import About from './pages/About.tsx'
//import Contact from './pages/Contact.tsx'
import Quiz from './pages/Quiz.tsx'

//import User from './pages/User.tsx'
//import Match from './pages/Match.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        {/* Uncomment these when you create the components:
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/user/:userid" element={<User />} />
        <Route path="/match" element={<Match />} />
        */}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)