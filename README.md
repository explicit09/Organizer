# Organizer

Product spec: `LIFE_ORGANIZER_SPEC.md`

## Getting started
- `npm install`
- `npm run dev`
- `npm test`

## API endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/organize` → natural language routing
- `POST /api/organize/preview` → preview AI routing without saving
- `GET /api/items?type=task|meeting|school&status=not_started|in_progress|completed|blocked`
- `POST /api/items`
- `GET /api/items/:id`
- `PATCH /api/items/:id`
- `DELETE /api/items/:id`
- `GET /api/search?q=...`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/goals`
- `POST /api/goals`
- `GET /api/goals/:id`
- `PATCH /api/goals/:id`
- `GET /api/checkins`
- `POST /api/checkins`
- `GET /api/attachments`
- `POST /api/attachments`
- `GET /api/notifications?until=ISO_DATE`
- `GET /api/outlook/connect`
- `GET /api/outlook/callback`
- `POST /api/outlook/events`

## Local storage
- SQLite file at `DB_PATH` (defaults to `./organizer.db`)
- Sample data auto-seeds in development unless `SEED_SAMPLE_DATA=false`

## AI (optional)
Set in `.env` to enable real AI routing:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)

## Outlook integration (optional)
Set these in `.env` before connecting:
- `OUTLOOK_CLIENT_ID`
- `OUTLOOK_CLIENT_SECRET`
- `OUTLOOK_REDIRECT_URI` (default `http://localhost:3000/api/outlook/callback`)
- `OUTLOOK_TENANT_ID` (default `common`)

## Docker
- `docker compose up --build`
