# Olympics Frontend (Vite)

## Scripts

- `npm run dev`: start local dev server (default `http://localhost:5173`)
- `npm run build`: production build to `dist`
- `npm run preview`: preview production build
- `npm test`: run Vitest tests

## API Base URL

Copy `.env.example` to `.env.local` if needed:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Notes

- Auth uses HTTP-only cookies from backend.
- Dashboard includes analytics panels and paginated athlete browsing.
