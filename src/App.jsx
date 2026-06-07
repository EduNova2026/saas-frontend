import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './login/auth';
// Correction de la faute de frappe (Dashborad -> Dashboard) pour le composant
import Dashboard from './app/(appli)/dashboard/page'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* Page de connexion */}
        <Route path="/" element={<div className="auth"><Auth /></div>} />
        
        {/* Page Dashboard désormais active */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;