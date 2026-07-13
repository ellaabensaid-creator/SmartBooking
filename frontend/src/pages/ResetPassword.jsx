import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const hasToken = useMemo(() => Boolean(token), [token]);
  const [requestForm, setRequestForm] = useState({ email });
  const [resetForm, setResetForm] = useState({ token, newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRequest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await api.requestPasswordReset(requestForm);
      setMessage(result.resetLink ? `Lien généré: ${result.resetLink}` : result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await api.confirmPasswordReset(resetForm);
      setMessage(result.message);
      setResetForm({ token: '', newPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Réinitialisation du mot de passe</h2>
      <p className="muted">
        {hasToken ? 'Définis un nouveau mot de passe avec le lien reçu.' : 'Demande un lien de réinitialisation pour ton compte.'}
      </p>

      {hasToken ? (
        <form className="form" onSubmit={submitReset}>
          <label>
            Jeton
            <input value={resetForm.token} onChange={(event) => setResetForm({ ...resetForm, token: event.target.value })} required />
          </label>
          <label>
            Nouveau mot de passe
            <input type="password" minLength={8} autoComplete="new-password" value={resetForm.newPassword} onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Mise à jour...' : 'Réinitialiser'}
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={submitRequest}>
          <label>
            Email
            <input type="email" autoComplete="email" value={requestForm.email} onChange={(event) => setRequestForm({ email: event.target.value })} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <p className="muted">
        <Link to="/login">Retour à la connexion</Link>
      </p>
    </div>
  );
}