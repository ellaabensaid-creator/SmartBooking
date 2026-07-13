import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'client',
    adminCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
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
      const signedUser = await register(form);
      navigate(signedUser.role === 'admin' ? '/admin' : '/client');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Inscription</h2>
      <form onSubmit={submit} className="form">
        <div className="two-cols">
          <label>
            Prénom
            <input minLength={2} maxLength={100} autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </label>
          <label>
            Nom
            <input minLength={2} maxLength={100} autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </label>
        </div>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Téléphone
          <input type="tel" inputMode="tel" maxLength={30} pattern="[0-9+()\-\s.]*" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Mot de passe
          <input type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        <label>
          Rôle
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="client">Client</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        {form.role === 'admin' && (
          <label>
            Code administrateur
            <input maxLength={120} value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} />
          </label>
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? 'Création...' : 'Créer le compte'}
        </button>
      </form>
      <p className="muted">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  );
}
