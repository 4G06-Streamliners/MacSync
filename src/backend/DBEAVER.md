# Connect to the database with DBeaver

## Connection details

Use these values in DBeaver (from `backend/.env`):

| Field      | Value        |
|-----------|--------------|
| **Host**  | `localhost`  |
| **Port**  | `5434`       |
| **Database** | `macsync_db` |
| **Username** | `postgres` |
| **Password** | `postgres` |

**URL (for “URL” connection type):**
```
postgresql://postgres:postgres@localhost:5434/macsync_db
```

---

## Steps in DBeaver

1. **New connection**  
   - `Database` → `New Database Connection`  
   - Choose **PostgreSQL** → Next.

2. **Main tab**  
   - **Host:** `localhost`  
   - **Port:** `5434`  
   - **Database:** `macsync_db`  
   - **Username:** `postgres`  
   - **Password:** `postgres`  
   - (Optional) Check “Save password”.

3. **Test connection**  
   - Click **Test Connection**.  
   - If DBeaver asks to download the PostgreSQL driver, allow it, then test again.

4. **Finish**  
   - Click **Finish**.  
   - Expand the connection → **Databases** → `macsync_db` → **Schemas** → `public` → **Tables** to see `users`, `roles`, `events`, `tickets`, `table_seats`, `bus_seats`, `user_roles`.

---

## Before connecting

- PostgreSQL must be running (e.g. `docker-compose up postgres -d` from the project root).  
- Port **5434** is used so it doesn’t conflict with a local PostgreSQL on 5432/5433.

---

## API: dump all tables

You can also get all table data as JSON from the backend:

```bash
curl http://localhost:3000/db
```

Returns: `{ users: [...], roles: [...], user_roles: [...], events: [...], tickets: [...], table_seats: [...], bus_seats: [...] }`
