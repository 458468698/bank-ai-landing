import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import LandingPage from './LandingPage'
import ToolPage from './ToolPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tool" element={<ToolPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
