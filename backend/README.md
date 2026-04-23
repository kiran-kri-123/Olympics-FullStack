# Backend MongoDB Setup

## 1. Create `.env`

Copy `.env.example` to `.env` and set:

- `MONGODB_URI`
- `AUTH_TOKEN_SECRET`
- `PORT`
- `FRONTEND_ORIGIN`

## 2. Start MongoDB

Make sure your local MongoDB server is running on the URI you configured.

## 3. Import Olympics data

Run from the `backend` folder:

```powershell
npm run seed
```

This imports:

- `users`
- `regions`
- `athletes`
- `summaries`

## 4. Start the API

```powershell
npm start
```

## 5. Start the frontend

From `frontend/myapp`:

```powershell
npm run dev
```

The app will then use MongoDB-backed auth and MongoDB-backed Olympics data APIs.

If you need a non-default API origin in the frontend, add a `.env` file in
`frontend/myapp` with:

```powershell
VITE_API_BASE_URL=http://localhost:5000
```
