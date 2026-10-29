# Milan Events API

REST API for event discovery and participant registration.
Node.js, Express, MongoDB (Mongoose), Zod validation.

- **Live base URL:** `https://srmmilan-backend.vercel.app/`
- **Repository:** `https://github.com/Arun-K-kumar/srm_milan-backend`
- **API docs:** [`docs/openapi.yaml`](docs/openapi.yaml) and [`docs/milan.postman_collection.json`](docs/milan.postman_collection.json)

## Setup

```bash
git clone <repo-url> && cd milan-events-api
npm install
cp .env.example .env     # then fill in the values
npm run dev              # http://localhost:3000
npm run seed             # optional sample events
npm test                 # runs against an in-memory MongoDB, no setup needed
```

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas) |
| `ADMIN_API_KEY` | Secret for admin endpoints, sent as the `X-API-Key` header |
| `PORT` | Optional, defaults to 3000 |

## Endpoints

| Method | Path | Auth | Success |
|---|---|---|---|
| GET | `/api/health` | none | 200 |
| POST | `/api/events` | admin | 201 |
| GET | `/api/events` (`?category=&upcoming=&page=&limit=`) | none | 200 |
| GET | `/api/events/:id` | none | 200 |
| POST | `/api/events/:id/register` | none | 201 |
| GET | `/api/events/:id/registrations` | admin | 200 |

Categories: `tech, music, sports, arts, food, business, education, other`.

## Example requests

```bash
BASE=https://YOUR-APP.vercel.app

# Create an event (admin)
curl -X POST $BASE/api/events -H "Content-Type: application/json" -H "X-API-Key: $ADMIN_API_KEY" \
  -d '{"title":"Milan Hack Night","description":"Build something cool.","category":"tech","start_datetime":"2027-03-01T18:00:00Z","venue":"Main Auditorium","capacity":100}'

# List, filter, get one
curl "$BASE/api/events?category=tech&upcoming=true"
curl $BASE/api/events/<id>

# Register a participant
curl -X POST $BASE/api/events/<id>/register -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@example.com"}'

# List registrants (admin)
curl $BASE/api/events/<id>/registrations -H "X-API-Key: $ADMIN_API_KEY"
```

Success responses look like `{ "data": ..., "meta": ... }`.

## Errors

Every error has the same shape:

```json
{ "error": { "code": "EVENT_FULL", "message": "This event has reached its registration capacity.", "details": {} } }
```

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR` (per-field messages in `details`), `INVALID_ID`, `INVALID_JSON` |
| 401 / 403 | `UNAUTHORIZED`, `FORBIDDEN` |
| 404 | `NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | `EVENT_FULL`, `ALREADY_REGISTERED`, `EVENT_CLOSED` |
| 429 | `RATE_LIMITED` |
| 503 | `DATABASE_UNAVAILABLE` |

## Design

- **Layers:** `routes/` (HTTP) calls `services/` (business rules), which call `repositories/` (database queries). Validation lives in `schemas.js`.
- **Data model:** `events` (title, description, category, startDateTime, venue, capacity, registeredCount) and `registrations` (event, name, email).
- **Duplicates:** a unique index on `(event, email)` makes the database reject a second registration. Emails are trimmed and lowercased first.
- **Capacity:** a spot is claimed with one atomic update, `registeredCount + 1` only while `registeredCount < capacity`, so concurrent requests cannot oversell. If saving the registration fails, the spot is released. Tests fire parallel requests to verify this.
- **Known limitation:** a server crash between claiming a spot and saving the registration could leave the counter one too high. MongoDB transactions would close that gap.
- **Security:** secrets only in environment variables, constant-time API key comparison, strict input validation (unknown fields rejected), helmet, rate limiting on registration, generic 500 responses with no internals leaked.
- **Admin access:** creating events and listing registrants need the `X-API-Key` header.