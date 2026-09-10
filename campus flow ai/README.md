# CampusFlow

CampusFlow combines Supabase authentication, academic tools, and AI-assisted study features.

## Local setup

1. Copy `.env.example` to `.env.local` for Vite and provide the backend variables in your deployment environment.
2. Install frontend dependencies with `npm install`.
3. Create a virtual environment and install `requirements.txt`.
4. Start the API with `python -m uvicorn api.index:app --reload --port 8000`.
5. Start React with `npm run dev`.

## Verification

```powershell
npm run lint
npm run build
python -m pytest
```

See `docs/auth-database-contract.md`, `docs/academic-integration-contract.md`, and `docs/ai-integration-contract.md` for integration details.
