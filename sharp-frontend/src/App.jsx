import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Picks from './pages/Picks';
import Pending from './pages/Pending';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function Dashboard() {
  const [activePage, setActivePage] = useState('picks');

  const renderPage = () => {
    switch (activePage) {
      case 'picks': return <Picks />;
      case 'pending': return <Pending />;
      case 'history': return <History />;
      case 'leaderboard': return <Leaderboard />;
      default: return <Picks />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      {renderPage()}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}