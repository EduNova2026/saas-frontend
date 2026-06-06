import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './login/auth';

function App() {
  return (
    // On enveloppe toute l'application dans le Router
    <Router>
      <Routes>
        {/* Ta route d'accueil qui charge ton composant de connexion */}
        <Route path="/" element={<div className="auth"><Auth /></div>} />
        
        {/* Tu pourras ajouter d'autres routes ici plus tard */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      </Routes>
    </Router>
  );
}

export default App;