# MajiGuard AI backend

This directory contains the FastAPI foundation and the Step 8.3 PostgreSQL connectivity layer. It is intentionally independent of the frozen `majiguard_ml` package.

## Environment

The backend uses its own Python virtual environment at `backend/.venv` (Python 3.13.15). From the repository root:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

For local PostgreSQL connectivity, create `backend/.env` (never commit it) and set the real local password:

```text
DATABASE_URL=postgresql+psycopg://postgres:YOUR_REAL_PASSWORD@localhost:5432/majiguard_db
```

The committed `.env.example` contains only a placeholder.

## Run tests

```powershell
pytest
```

The real database test runs only when `DATABASE_URL` is configured in the process environment. It executes `SELECT 1` and closes the engine afterward.

## Start the API

```powershell
uvicorn app.main:app --reload
```

The API exposes:

- `GET /health` — liveness response (`{"status":"ok"}`)
- `GET /api/v1/health` — canonical versioned liveness response
- `/docs` — Swagger UI
- `/openapi.json` — OpenAPI schema

## Step 8.3 scope

The database layer creates only a SQLAlchemy engine, session factory, and declarative base. No application tables, models, migrations, data imports, ML integration, authentication, or frontend integration are implemented. PostgreSQL setup must be completed with a local `DATABASE_URL`; credentials are never stored in source control.
