import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/client', { replace: true });
    }
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const signedUser = await login(form);
      navigate(signedUser.role === 'admin' ? '/admin' : '/client');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Connexion</h2>
      <form onSubmit={submit} className="form">
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Mot de passe
          <input type="password" autoComplete="current-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      <p className="muted">
        Pas encore de compte ? <Link to="/register">S'inscrire</Link>
      </p>
      <p className="muted">
        Mot de passe oublié ? <Link to="/reset-password">Réinitialiser</Link>
      </p>
    </div>
  );
}
