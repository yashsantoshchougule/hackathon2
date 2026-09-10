# CampusFlow AI

Authenticated AI features for CampusFlow: academic assistant, deterministic priority engine,
confirmation-gated study planner, notice intelligence, evidence-locked study copilot, and typed
dashboard recommendations.

## Local setup

1. Copy `.env.example` to `.env` and fill the Supabase and AI provider values.
2. Install frontend dependencies with `npm install`.
3. Create a virtual environment and install `requirements.txt`.
4. Start the API with `python -m uvicorn api.index:app --reload --port 8000`.
5. Start React with `npm run dev`.

The AI API fails closed when Supabase authentication is not configured. It never substitutes demo
students or hardcoded academic data. See `docs/ai-integration-contract.md` before integrating the
database, auth, shared UI, or academic-module branches.

## Verification

```powershell
npm run lint
npm run build
python -m pytest
```
