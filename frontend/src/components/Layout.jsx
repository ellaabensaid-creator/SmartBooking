import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          SmartBooking
        </Link>
        <nav className="nav">
          <NavLink to="/services">Services</NavLink>
          {user && <NavLink to="/profile">Mon profil</NavLink>}
          {user?.role === 'client' && <NavLink to="/client">Espace client</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Espace admin</NavLink>}
          {!user ? <NavLink to="/login">Connexion</NavLink> : <button onClick={handleLogout}>Déconnexion</button>}
        </nav>
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}
