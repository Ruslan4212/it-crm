# IT-CRM — Project Context

## Architecture
- **Backend**: Node/Express on port 3000 (Docker), entry: `backend/index.js`
- **Frontend**: React + Vite (dev: port 5173, prod: Nginx on port 80)
- **Database**: PostgreSQL 15, container name `crm_postgres`
- **Auth**: JWT (pbkdf2 password hashing, no bcrypt)

## Commands
```bash
make dev          # Start dev with live reload
make up           # Start production
make restart      # Rebuild & restart all
make logs         # Follow all logs
make psql         # Open PostgreSQL shell
```

## Docker
- `docker compose up -d --build` — production
- `docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build` — dev
- Frontend dev: `npm run dev -- --host 0.0.0.0`
- Backend dev: `npx nodemon index.js`

## CI/CD
- Push to `main` → build + push Docker images to Docker Hub (needs secrets)
- PR to `main` → build + lint checks
- Secrets needed: `DOCKER_USERNAME`, `DOCKER_PASSWORD`

## Key Design Decisions
- Multi-group tasks via `task_groups` junction table (M:N)
- No clients/contacts module
- i18n: simple LocaleContext (no react-intl/i18next)
- Modals for create/edit forms, not separate pages
- Admin seed: admin@crm.local / admin123

## Dev Notes
- `docker-compose.override.yml` enables volume mounts + nodemon for hot reload
- `.env` is gitignored; use `.env.example` as template
- `backend/node_modules/` already exists locally
