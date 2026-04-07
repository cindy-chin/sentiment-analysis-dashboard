import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TopicOverview from './pages/TopicOverview'
import TopicDeepDive from './pages/TopicDeepDive'
import Timeline from './pages/Timeline'
import EmotionAnalysis from './pages/EmotionAnalysis'
import DocumentSearch from './pages/DocumentSearch'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TopicOverview />} />
        <Route path="/topics/:id" element={<TopicDeepDive />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/emotions" element={<EmotionAnalysis />} />
        <Route path="/search" element={<DocumentSearch />} />
      </Route>
    </Routes>
  )
}

export default App
