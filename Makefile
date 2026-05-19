.PHONY: dev up down logs build restart psql migrate

# Production start
up:
	docker compose up -d --build

# Production stop
down:
	docker compose down

# Production rebuild & restart
restart:
	docker compose up -d --build --force-recreate

# Dev start (with live reload)
dev:
	docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build

# Dev stop
dev-down:
	docker compose -f docker-compose.yml -f docker-compose.override.yml down

# Follow logs
logs:
	docker compose logs -f

# Build without starting
build:
	docker compose build

# Backend logs only
logs-be:
	docker compose logs -f backend

# Frontend logs only
logs-fe:
	docker compose logs -f frontend

# Open PostgreSQL shell
psql:
	docker compose exec -it db psql -U crm crm

# Run migrations manually (if needed)
migrate:
	docker compose exec -T backend node src/db/migrate.js
