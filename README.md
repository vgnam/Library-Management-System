# Library Management System

A full‑stack Library Management System.

- **Backend:** FastAPI (Python)
- **Frontend:** TypeScript + React (Vite)
- **Database:** PostgreSQL (default, configurable via environment variables)

---

## Overview

This repository contains a full-stack library management application with separate frontend and backend components, plus database migrations and Docker configuration for easy local development.

Contents:
- Local development instructions for frontend and backend
- Docker compose to run frontend, backend, and PostgreSQL
- Migration and testing guidance

---

## Prerequisites

- Git
- Python 3.10.x (recommended for the project's venv)
- Node.js (>=16)
- Docker (optional, recommended for running the full stack locally)

(Optional) Create and activate a Python virtual environment for backend development:

```powershell
python -m venv .\venv
.\venv\Scripts\Activate.ps1    # PowerShell
```

---

## Frontend (local development)

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the dev server:

```bash
npm run dev
```

By default Vite serves at `http://localhost:5173` (or `3000` if configured differently).

---

## Backend (local development)

1. Activate the virtual environment (if used):

```powershell
.\venv\Scripts\Activate.ps1
```

2. Install backend dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables (create a `.env` file or export variables directly):

Example `.env`:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/library_db
SECRET_KEY=your-secret-key
```

4. Run the FastAPI application in development mode:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API documentation: `http://localhost:8000/docs`

---

## Run the full stack with Docker (frontend + backend + DB)

A `docker-compose.yml` is provided to quickly start the frontend, backend, and PostgreSQL services.

Build and run:

```powershell
cd D:\Library-Management-System
docker compose up --build
```

Stop and remove volumes:

```powershell
docker compose down -v
```

---


## Important environment variables

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:postgres@db:5432/library_db`)
- `SECRET_KEY` — secret key used for JWT/signing
- `PYTHONUNBUFFERED=1` — recommended for unbuffered Python output in containers

---

## Troubleshooting

- If `docker compose up` fails: ensure the Docker daemon is running (`docker ps`).
- If the backend cannot connect to the database: check `DATABASE_URL` and the DB container logs (`docker logs library-db`).
- If dependencies are missing: update `requirements.txt` and rebuild the Docker image.

---

## Contributing

- Fork the repo → create a feature branch → open a pull request. Include tests for changes.

---

## License

Check the repository license file or contact the project owner.

---

See configuration files `docker-compose.yml`, `requirements.txt`, and `alembic.ini` for full environment details.
