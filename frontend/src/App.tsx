import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Analysis from './pages/Analysis'
import HistoryPage from './pages/History'
import ProfilePage from './pages/ProfilePage'

/**
 * App — root router.
 *
 * Routes:
 *   /           Landing screen (exercise selector, privacy notice)
 *   /analysis   Live camera + analytics workspace
 *   /history    Workout session history
 *   /profile    User profile & guest mode management
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
