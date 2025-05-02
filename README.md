# Usage
### Build and run all services
```bash
make
```
- Starts all containers (frontend, backend, Nginx)
- Access the site at: https://localhost:8080

### Stop services
```bash
make down
```
- Stops running containers and removes frontend volume, but retains database

### Clean up database and cache
```bash
make fclean
```
- Removes containers, database volume, and cached files

# Container Overview
## 🔧 Backend (Fastify)
- Runs on: http://backend:3000 (inside the Docker network only)
- Entrypoint: src/server.ts
  - **Routes:** → src/routes.ts
  - **Authentication routes & logic:** → src/auth/
  - **Pong game logic:** → src/game/
  - **SQLite database:**
    - Schema → src/schema.sql
    - Models → src/models/
  - **Fastify plugins:** → src/plugins/
  - **TypeScript declarations:** → @types/

## 🖥️ Frontend (Webpack + Tailwind)
- Builds static files served by Nginx
- Entrypoint: src/ts/main.ts
  - **Client-side navigation:** → src/ts/router.ts
  - **Pages:** → src/ts/views/
  - **API service layer:** → src/ts/services/
  - **Type declarations:** → src/ts/types.ts

## 🌐 Nginx (Reverse Proxy + HTTPS)
- Serves the frontend on: https://localhost:8080
- Reverse-proxies API requests: /api/ → http://backend:3000/api/
