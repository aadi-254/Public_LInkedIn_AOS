import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Desktop from './pages/Desktop';
import Sign from './pages/Sign';
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Sign />} />
      <Route path="/desktop" element={<Desktop />} />
    </Routes>
  )
}

export default App
