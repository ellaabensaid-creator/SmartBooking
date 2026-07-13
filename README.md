# SmartBooking

Application web de prise de rendez-vous en ligne avec frontend React, backend Node.js/Express et base MySQL.

## Structure

- `frontend/` : interface utilisateur React
- `backend/` : API Express
- `database/schema.sql` : schéma MySQL final

## Lancement local

### 1. Base de données

Importer `database/schema.sql` dans MySQL.

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Comptes de démonstration

- Admin: `admin@smartbooking.local` / `Password123!`
- Client: `client@smartbooking.local` / `Password123!`

## API

Le backend écoute par défaut sur `http://localhost:4000`.
Le frontend Vite écoute par défaut sur `http://localhost:5173`.
