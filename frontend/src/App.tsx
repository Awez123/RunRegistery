import { Route, Routes } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/dashboardPage'

function App() {

  return (
    <Routes>
    <Route path="/Login" element={<LoginPage />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
  )
}

export default App
