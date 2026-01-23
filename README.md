# LibApartado – Arquitectura de Microservicios

Ahora el sistema está 100% desacoplado en microservicios independientes con su propia base de datos y ciclo de despliegue.

## Servicios
- **accounts-service**: autenticación JWT y gestión de usuarios/roles (ADMIN, TEACHER). DB: `accounts-db`.
- **spaces-service**: catálogo de espacios y disponibilidad; consulta a reservations-service para bloques ocupados. DB: `spaces-db`.
- **reservations-service**: crea/gestiona reservas y valida solapamientos por espacio. DB: `reservations-db`.
- **gateway**: NGINX que enruta `/api/auth|users` ? accounts, `/api/spaces` ? spaces, `/api/reservations` ? reservations.
- **frontend**: React/Vite servido por NGINX; consume la API vía `gateway`.

## Puertos expuestos (host)
- Gateway: `http://localhost:8080`
- Frontend: `http://localhost:3001` (proxy interno a gateway en `/api`)
- MySQL: cuentas `3307`, espacios `3308`, reservas `3309` (opcional para debug)

## Variables clave
Todos los servicios comparten la misma clave JWT:
- `JWT_SECRET` (default `super-secret-jwt`) debe ser idéntica en accounts/spaces/reservations.

Duraciones de reservas (solo reservations-service):
- `RESERVATION_MIN_DURATION_MINUTES` (default 30)
- `RESERVATION_MAX_DURATION_HOURS` (default 4)

## Levantar con Docker Compose
1) (Opcional) crea un archivo `.env` en la raíz con tus overrides (ej.: `JWT_SECRET=loquesea`).
2) Ejecuta:
```bash
docker compose up -d --build
```
Cada API corre su migración al arrancar. Semillas no incluidas; crea usuarios vía `/api/users/` o admin Django si lo habilitas.

## Endpoints (vía gateway)
- Auth: `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/me/`
- Users (ADMIN): `/api/users/`
- Spaces: `/api/spaces/` CRUD (ADMIN para mutar) y `/api/spaces/{id}/availability/?start=&end=`
- Reservations: `/api/reservations/` (listar por rango, filtrar `space_id`), `/api/reservations/mine/`,
  crear `POST /api/reservations/`, acciones `/{id}/cancel/`, `/{id}/approve/`, `/{id}/reject/`,
  disponibilidad liviana `GET /api/reservations/busy/?space_id=&start=&end=`

## Comunicación entre servicios
- JWT stateless: spaces/reservations decodifican el token sin tabla de usuarios.
- Spaces consulta availability en reservations-service (`/api/reservations/busy/`).
- Reservations valida espacios en spaces-service (`/api/spaces/{id}/`).
- Cada servicio usa su propia base de datos; no hay joins cruzados.

## Estructura de carpetas
- `services/accounts_service/` (Django + DRF)
- `services/spaces_service/` (Django + DRF, auth stateless)
- `services/reservations_service/` (Django + DRF, auth stateless)
- `gateway/nginx.conf` (routing API)
- `frontend/` (React/Vite + nginx proxy a gateway)

## Scripts útiles (contenedores)
- Migraciones manuales: `docker compose exec accounts python manage.py migrate` (idem spaces/reservations)
- Abrir shell Django: `docker compose exec reservations python manage.py shell`

## Notas
- Tokens JWT incluyen `user_id`, `email`, `role`, `first_name`, `last_name`.
- Disponibilidad: spaces-service devuelve lo que reservations-service reporte; si este falla, la respuesta es 502.
- Para entornos no Docker, usa los `.env.example` dentro de cada servicio y ejecuta `python manage.py runserver` por servicio con DBs separadas.
