function notFound(req, res) {
  res.status(404).json({ message: 'Route introuvable.' });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur serveur.';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ message });
}

module.exports = { notFound, errorHandler };
