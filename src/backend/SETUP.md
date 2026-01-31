# NestJS Backend with Fastify

## Setup Complete ✅

This NestJS backend has been configured with:
- **Fastify** as the HTTP adapter (faster than Express)
- **CORS** enabled for all origins
- **Health endpoint** at `/health`

## Available Endpoints

- `GET /` - Returns "Hello World!"
- `GET /health` - Returns health status with timestamp and uptime

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The server will run on `http://localhost:3000` by default.

## CORS Configuration

CORS is configured to allow:
- All origins (`origin: true`)
- Credentials (`credentials: true`)

## Health Endpoint Response

The `/health` endpoint returns:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T...",
  "uptime": 123.456
}
```
