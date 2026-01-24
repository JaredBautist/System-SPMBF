# Manual de Despliegue (100%)

Manual para levantar el stack completo (gateway + frontend + 3 microservicios Django + 3 MySQL) desde cero, en local o servidor.

---

## 1. Requisitos previos
- Docker y Docker Compose v2+
- Puertos libres por defecto:
  - Gateway/API: 8080 (puedes cambiar a 80 en prod)
  - Frontend: 3000
  - MySQL expuestos (opcional): 3307 (accounts), 3308 (spaces), 3309 (reservations)
- Node 18+ solo si vas a reconstruir el frontend (`npm run build`)

---

## 2. Variables de entorno (`.env`)
Usa el archivo `.env` (único). Ajusta antes de desplegar:

```
JWT_SECRET=changeme-64chars

# Accounts
ACCOUNTS_SECRET_KEY=changeme-accounts
ACCOUNTS_DEBUG=0
ACCOUNTS_ALLOWED_HOSTS=tudominio.com,localhost,127.0.0.1,0.0.0.0
ACCOUNTS_DB_NAME=accounts_db
ACCOUNTS_DB_USER=accounts_user
ACCOUNTS_DB_PASSWORD=changeme-accounts-pass
ACCOUNTS_DB_ROOT_PASSWORD=changeme-accounts-root

# Spaces
SPACES_SECRET_KEY=changeme-spaces
SPACES_DEBUG=0
SPACES_ALLOWED_HOSTS=tudominio.com,localhost,127.0.0.1,0.0.0.0
SPACES_DB_NAME=spaces_db
SPACES_DB_USER=spaces_user
SPACES_DB_PASSWORD=changeme-spaces-pass
SPACES_DB_ROOT_PASSWORD=changeme-spaces-root

# Reservations
RESERVATIONS_SECRET_KEY=changeme-reservations
RESERVATIONS_DEBUG=0
RESERVATIONS_ALLOWED_HOSTS=tudominio.com,localhost,127.0.0.1,0.0.0.0
RESERVATIONS_DB_NAME=reservations_db
RESERVATIONS_DB_USER=reservations_user
RESERVATIONS_DB_PASSWORD=changeme-res-pass
RESERVATIONS_DB_ROOT_PASSWORD=changeme-res-root

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Config reservas
RESERVATION_MIN_DURATION_MINUTES=30
RESERVATION_MAX_DURATION_HOURS=4
TIME_ZONE=America/Bogota

# Admin bootstrap (se crea/actualiza al arrancar accounts)
ADMIN_EMAIL=adminlocal@fesc.edu.co
ADMIN_PASSWORD=FESC2025
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=Local
```

Para producción crea `.env.production` con los mismos campos pero secretos reales y dominio/puertos de prod.

---

## 3. Build del frontend (necesario porque se monta `./frontend/dist`)
```bash
cd frontend
npm install           # primera vez
npm run build         # genera ./frontend/dist
cd ..
```
Cada vez que cambies el frontend, repite `npm run build` y reinicia `frontend`.

---

## 4. Despliegue limpio desde cero
> Advertencia: `down -v` borra datos de MySQL (volúmenes).

Despliegue local con `.env`:
```bash
docker compose down -v
DOCKER_BUILDKIT=0 docker compose up -d --build
docker compose ps
```

Con `.env.production`:
```bash
docker compose --env-file .env.production down -v
DOCKER_BUILDKIT=0 docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
```

---

## 5. Accesos por defecto
- Frontend: http://localhost:3000
- API vía gateway: http://localhost:8080/api/…
- Admin app: credenciales `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## 6. Volúmenes y datos
Volúmenes automáticos:
- `system-spmbf_accounts_mysql_data`
- `system-spmbf_spaces_mysql_data`
- `system-spmbf_reservations_mysql_data`

Si cambias contraseñas y ves “Access denied”, alinea env vars con MySQL o elimina volúmenes y levanta de nuevo.

---

## 7. Cambios de puertos/dominio
- Gateway: en `docker-compose.yml` cambia `ports: - "8080:80"` a `80:80` para prod.
- Frontend: `ports: - "3000:80"`. Ajusta `CORS_ALLOWED_ORIGINS` si cambias.

---

## 8. TLS (opcional)
Pon un reverse proxy externo (nginx/traefik) con certificados y apunta al gateway (puerto 80 interno). Si prefieres TLS en el mismo gateway, agrega server SSL en `gateway/nginx.conf` y monta los certificados como volumen.

---

## 9. Verificación rápida
```bash
# Login admin
curl -X POST http://localhost:8080/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"adminlocal@fesc.edu.co","password":"FESC2025"}'

# Listar reservas en rango
curl "http://localhost:8080/api/reservations/?start=2025-12-01T00:00:00Z&end=2026-04-01T00:00:00Z" \
  -H "Authorization: Bearer <access_token>"
```

---

## 10. Actualizar versión
```bash
git pull                       # si aplica
cd frontend && npm run build && cd ..
DOCKER_BUILDKIT=0 docker compose up -d --build
```

---

## 11. Troubleshooting común
- **Frontend no refleja cambios**: `npm run build` + `docker compose restart frontend`; fuerza recarga del navegador (Ctrl+F5).
- **Access denied MySQL**: credenciales del `.env` no coinciden con lo guardado en el volumen; borra volúmenes o ejecuta `ALTER USER` dentro del contenedor.
- **CORS**: añade tu dominio/puerto a `CORS_ALLOWED_ORIGINS`.
- **Hosts no permitidos**: añade dominio/IP a `*_ALLOWED_HOSTS`.

---

## 12. Comandos útiles
- Estado: `docker compose ps`
- Logs: `docker compose logs -f <servicio>`
- Reiniciar: `docker compose restart <servicio>`
- Borrar solo datos MySQL: `docker volume rm system-spmbf_*_mysql_data`

---

Con estos pasos tienes el despliegue completo y repetible al 100%. Good deploy! 🎉
