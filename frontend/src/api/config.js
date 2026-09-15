const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Crée une URL API complète
 * @param {string} endpoint - Endpoint de l'API (ex: '/auth/login')
 * @returns {string} URL complète
 */
export function getApiUrl(endpoint) {
  return `${API_URL}${endpoint}`;
}

/**
 * Effectue une requête API
 * @param {string} endpoint - Endpoint de l'API
 * @param {object} options - Options de la requête (method, body, headers, etc.)
 * @returns {Promise} Réponse de l'API
 */
export async function apiCall(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export default API_URL;
