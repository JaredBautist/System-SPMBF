# DOCUMENTACION COMPLETA DEL BACKEND - LibApartado

## Sistema de Reservas de Espacios Academicos

---

## 1. ARQUITECTURA DEL SISTEMA

### Tipo de Arquitectura: **Microservicios 100% Desacoplados**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Browser)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │   FRONTEND:3000   │               │   GATEWAY:8080    │
        │   (React + Vite)  │               │     (NGINX)       │
        └───────────────────┘               └─────────┬─────────┘
                                                      │
                    ┌─────────────────┬───────────────┼───────────────┐
                    │                 │               │               │
                    ▼                 ▼               ▼               ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │   ACCOUNTS    │   │    SPACES     │   │ RESERVATIONS  │
        │   SERVICE     │   │   SERVICE     │   │   SERVICE     │
        │  (Django)     │   │  (Django)     │   │  (Django)     │
        └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
                │                   │                   │
                ▼                   ▼                   ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │  accounts-db  │   │   spaces-db   │   │reservations-db│
        │  MySQL:3307   │   │  MySQL:3308   │   │  MySQL:3309   │
        └───────────────┘   └───────────────┘   └───────────────┘
```

### Caracteristicas de la Arquitectura

| Caracteristica | Descripcion |
|----------------|-------------|
| **Desacoplamiento** | Cada microservicio tiene su propia base de datos independiente |
| **Comunicacion** | HTTP REST entre servicios via red interna Docker |
| **Autenticacion** | JWT Stateless compartido entre todos los servicios |
| **Gateway** | NGINX como punto unico de entrada para el API |
| **Escalabilidad** | Cada servicio puede escalar independientemente |

---

## 2. PATRONES DE DISENO UTILIZADOS

### 2.1 API Gateway Pattern
- NGINX actua como punto unico de entrada
- Enruta peticiones a los microservicios correspondientes
- Oculta la complejidad interna de la arquitectura

### 2.2 Database per Service Pattern
- Cada microservicio tiene su propia base de datos MySQL
- Evita acoplamiento de datos entre servicios
- Permite cambiar tecnologia de BD por servicio

### 2.3 Stateless Authentication (JWT)
- Tokens JWT contienen toda la informacion del usuario
- Los servicios no consultan la BD de usuarios
- Permite escalado horizontal sin compartir sesiones

### 2.4 Service Layer Pattern
- Logica de negocio separada en `services.py`
- Views delgadas que delegan a servicios
- Facilita testing y mantenimiento

### 2.5 Repository Pattern (via Django ORM)
- Django ORM actua como capa de abstraccion de datos
- Modelos encapsulan acceso a datos

### 2.6 Factory Pattern (en Tests)
- `user_factory` para crear usuarios de prueba
- Fixtures reutilizables con pytest

---

## 3. MICROSERVICIOS - QUE HACE CADA UNO

### 3.1 ACCOUNTS SERVICE (Autenticacion)

**Proposito:** Gestiona usuarios y autenticacion JWT

**Responsabilidades:**
- Login y generacion de tokens JWT
- Refresh de tokens
- CRUD de usuarios (solo admin)
- Consulta de perfil del usuario autenticado

**Modelo de Datos:**
```python
User:
├── email (PK, unique)
├── first_name
├── last_name
├── role (ADMIN | TEACHER)
├── is_active
└── date_joined
```

**Endpoints:**

| Metodo | Endpoint | Descripcion | Acceso |
|--------|----------|-------------|--------|
| POST | `/api/auth/login/` | Obtener tokens JWT | Publico |
| POST | `/api/auth/refresh/` | Refrescar access token | Publico |
| GET | `/api/auth/me/` | Datos del usuario actual | Autenticado |
| GET | `/api/users/` | Listar usuarios | Admin |
| POST | `/api/users/` | Crear usuario | Admin |

---

### 3.2 SPACES SERVICE (Espacios)

**Proposito:** Catalogo de espacios reservables y consulta de disponibilidad

**Responsabilidades:**
- CRUD de espacios (aulas, laboratorios, etc.)
- Consulta de disponibilidad (llama a reservations)
- Validacion de estado activo/inactivo

**Modelo de Datos:**
```python
Space:
├── id (PK)
├── name
├── description
├── location
├── is_active
├── created_at
└── updated_at
```

**Endpoints:**

| Metodo | Endpoint | Descripcion | Acceso |
|--------|----------|-------------|--------|
| GET | `/api/spaces/` | Listar espacios | Autenticado |
| GET | `/api/spaces/{id}/` | Detalle de espacio | Autenticado |
| POST | `/api/spaces/` | Crear espacio | Admin |
| PUT | `/api/spaces/{id}/` | Editar espacio | Admin |
| DELETE | `/api/spaces/{id}/` | Eliminar espacio | Admin |
| GET | `/api/spaces/{id}/availability/` | Consultar disponibilidad | Autenticado |

**Comunicacion Inter-Servicio:**
```
Spaces Service ──HTTP GET──▶ Reservations Service
                              /api/reservations/busy/
```

---

### 3.3 RESERVATIONS SERVICE (Reservas)

**Proposito:** Gestion completa del ciclo de vida de reservas

**Responsabilidades:**
- Crear reservas (validando solapamientos)
- Aprobar/Rechazar reservas (admin)
- Cancelar reservas (owner o admin)
- Consultar bloques ocupados (para otros servicios)
- Validar existencia de espacios (llama a spaces)

**Modelo de Datos:**
```python
Reservation:
├── id (PK)
├── space_id, space_name, space_location  # Desnormalizado
├── created_by_id, created_by_email       # Desnormalizado
├── title
├── description
├── start_at
├── end_at
├── status (PENDING | APPROVED | REJECTED | CANCELLED)
├── approved_by_id, approved_by_email     # Quien decidio
├── decision_at
├── decision_note
├── created_at
└── updated_at
```

**Maquina de Estados:**
```
                     ┌─────────────┐
                     │   PENDING   │
                     └──────┬──────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   APPROVED   │ │   REJECTED   │ │  CANCELLED   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

**Endpoints:**

| Metodo | Endpoint | Descripcion | Acceso |
|--------|----------|-------------|--------|
| GET | `/api/reservations/` | Listar (con rango) | Autenticado |
| GET | `/api/reservations/{id}/` | Detalle | Autenticado |
| POST | `/api/reservations/` | Crear reserva | Autenticado |
| PUT | `/api/reservations/{id}/` | Editar reserva | Admin |
| GET | `/api/reservations/mine/` | Mis reservas | Autenticado |
| POST | `/api/reservations/{id}/approve/` | Aprobar | Admin |
| POST | `/api/reservations/{id}/reject/` | Rechazar | Admin |
| POST | `/api/reservations/{id}/cancel/` | Cancelar | Owner/Admin |
| GET | `/api/reservations/busy/` | Bloques ocupados | Interno |

**Reglas de Negocio:**
- Duracion minima: 30 minutos
- Duracion maxima: 4 horas
- No permite solapamientos en el mismo espacio
- Solo estados PENDING y APPROVED bloquean horarios

---

## 4. ESTRUCTURA DE CARPETAS

```
System-SPMBF/
├── docker-compose.yml           # Orquestacion de todos los servicios
├── requirements.txt             # Dependencias Python compartidas
├── .env                         # Variables de entorno
├── DEPLOYMENT.md                # Manual de despliegue
│
├── services/                    # MICROSERVICIOS BACKEND
│   │
│   ├── accounts_service/        # Servicio de Autenticacion
│   │   ├── Dockerfile           # Build del contenedor
│   │   ├── manage.py
│   │   ├── wait_for_db.py       # Espera conexion MySQL
│   │   ├── create_admin.py      # Crea admin automaticamente
│   │   ├── accounts_service/    # Config Django
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   │   └── accounts/            # App Django
│   │       ├── models.py        # Modelo User
│   │       ├── views.py         # Vistas API
│   │       ├── serializers.py
│   │       └── permissions.py
│   │
│   ├── spaces_service/          # Servicio de Espacios
│   │   ├── Dockerfile
│   │   ├── manage.py
│   │   ├── wait_for_db.py
│   │   ├── spaces_service/      # Config Django
│   │   │   └── settings.py
│   │   ├── spaces/              # App principal
│   │   │   ├── models.py        # Modelo Space
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   └── authentication.py # JWT Stateless
│   │   └── core/                # App de modelos base
│   │       └── models.py        # TimeStampedModel
│   │
│   └── reservations_service/    # Servicio de Reservas
│       ├── Dockerfile
│       ├── manage.py
│       ├── wait_for_db.py
│       ├── reservations_service/
│       │   └── settings.py
│       ├── reservations/        # App principal
│       │   ├── models.py        # Modelo Reservation
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── services.py      # Logica de negocio
│       │   ├── authentication.py
│       │   └── permissions.py
│       └── core/
│           └── models.py
│
├── gateway/                     # API Gateway
│   └── nginx.conf               # Configuracion de routing
│
├── frontend/                    # Aplicacion React
│   ├── Dockerfile               # Build multi-stage
│   └── src/
│
└── tests/                       # Tests del proyecto
    ├── conftest.py              # Fixtures de pytest
    └── test_reservations.py     # Tests de integracion
```

---

## 5. TECNOLOGIAS UTILIZADAS

### Backend

| Tecnologia | Version | Uso |
|------------|---------|-----|
| **Python** | 3.11 | Lenguaje de programacion |
| **Django** | 4.2.11 | Framework web |
| **Django REST Framework** | 3.14.0 | APIs REST |
| **djangorestframework-simplejwt** | 5.3.1 | Autenticacion JWT |
| **PyMySQL** | 1.1.1 | Conector MySQL |
| **Gunicorn** | 21.2.0 | Servidor WSGI produccion |
| **django-cors-headers** | 4.4.0 | Manejo de CORS |
| **drf-spectacular** | 0.27.2 | Documentacion OpenAPI |

### Base de Datos

| Tecnologia | Version | Uso |
|------------|---------|-----|
| **MySQL** | 8.0 | Base de datos relacional |
| **HeidiSQL** | - | Cliente GUI para gestion |

### Infraestructura

| Tecnologia | Uso |
|------------|-----|
| **Docker** | Contenedorizacion |
| **Docker Compose** | Orquestacion |
| **NGINX** | API Gateway / Reverse Proxy |

---

## 6. DOCKERIZACION Y DESPLIEGUE

### Imagenes Generadas (7 contenedores)

```
┌─────────────────────────────────────────────────────────────────┐
│                    docker-compose up --build                     │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐            ┌─────────────┐           ┌─────────────┐
│FRONTEND │            │   GATEWAY   │           │  3 x APIs   │
│ (build) │            │  (nginx)    │           │  (Django)   │
└─────────┘            └─────────────┘           └─────────────┘
                                                       │
                              ┌─────────────┬──────────┼──────────┐
                              ▼             ▼          ▼          ▼
                         ┌─────────┐  ┌─────────┐ ┌─────────┐
                         │accounts │  │ spaces  │ │reservat.│
                         │   db    │  │   db    │ │   db    │
                         └─────────┘  └─────────┘ └─────────┘
```

### Dockerfile de cada Microservicio

```dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY services/<nombre>_service /app

EXPOSE 8000
CMD ["gunicorn", "<nombre>_service.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Flujo de Inicio

```
1. MySQL containers inician
   └── Healthcheck: mysqladmin ping

2. Servicios Django esperan MySQL
   └── wait_for_db.py (30 intentos)

3. Migraciones automaticas
   └── python manage.py migrate

4. Creacion de admin (accounts)
   └── python create_admin.py

5. Gunicorn inicia
   └── 2 workers, 2 threads, timeout 120s

6. Gateway espera servicios
   └── depends_on: accounts, spaces, reservations

7. Frontend espera gateway
   └── depends_on: gateway
```

### Comandos de Despliegue

```bash
# Despliegue limpio
docker compose down -v
DOCKER_BUILDKIT=0 docker compose up -d --build

# Ver estado
docker compose ps

# Ver logs
docker compose logs -f <servicio>
```

---

## 7. TESTING

### Framework: pytest + pytest-django

### Tipos de Tests Implementados

| Tipo | Descripcion | Archivo |
|------|-------------|---------|
| **Unit Tests** | Validacion de logica de negocio | `test_reservations.py` |
| **Integration Tests** | Tests de API con cliente REST | `test_reservations.py` |

### Fixtures (conftest.py)

```python
@pytest.fixture
def api_client():          # Cliente REST para tests

@pytest.fixture
def user_factory():        # Fabrica de usuarios

@pytest.fixture
def admin_user():          # Usuario admin pre-creado

@pytest.fixture
def teacher_user():        # Usuario teacher pre-creado

@pytest.fixture
def space():               # Espacio de prueba
```

### Tests Implementados

1. **test_overlap_validation_blocks_conflict**
   - Verifica que no se permitan reservas solapadas

2. **test_teacher_can_list_public_reservations_but_cannot_patch**
   - Verifica permisos de lectura vs escritura

3. **test_teacher_can_cancel_own_reservation**
   - Verifica que un teacher puede cancelar su propia reserva

4. **test_admin_can_approve_and_reject**
   - Verifica flujo de aprobacion/rechazo por admin

5. **test_create_reservation_uses_default_space**
   - Verifica creacion con espacio por defecto

### Ejecutar Tests

```bash
pytest tests/ -v
```

---

## 8. AUTENTICACION JWT STATELESS

### Flujo de Autenticacion

```
1. Usuario → POST /api/auth/login/ {email, password}
                    │
                    ▼
2. Accounts Service valida credenciales
                    │
                    ▼
3. Genera JWT con payload:
   {
     "user_id": 1,
     "email": "user@fesc.edu.co",
     "role": "TEACHER",
     "first_name": "Juan",
     "last_name": "Perez",
     "exp": 1738000000
   }
                    │
                    ▼
4. Cliente guarda access_token y refresh_token
                    │
                    ▼
5. Peticiones subsecuentes:
   Header: Authorization: Bearer <access_token>
                    │
                    ▼
6. Cualquier microservicio decodifica JWT (sin consultar BD)
   usando JWTStatelessAuthentication
```

### Clase StatelessUser

```python
class StatelessUser:
    def __init__(self, user_id, email, role, first_name, last_name):
        self.id = user_id
        self.email = email
        self.role = role          # ADMIN o TEACHER
        self.first_name = first_name
        self.last_name = last_name

    @property
    def is_authenticated(self):
        return True
```

---

## 9. COMUNICACION ENTRE SERVICIOS

### Llamadas HTTP Internas

```
┌──────────────────┐     GET /api/spaces/{id}/    ┌─────────────────┐
│   RESERVATIONS   │ ─────────────────────────────▶│     SPACES      │
│    SERVICE       │                               │    SERVICE      │
└──────────────────┘                               └─────────────────┘
        │
        │ fetch_space() en services.py
        │ Valida que el espacio existe y esta activo
        │
┌──────────────────┐  GET /api/reservations/busy/ ┌─────────────────┐
│     SPACES       │ ─────────────────────────────▶│  RESERVATIONS   │
│    SERVICE       │                               │    SERVICE      │
└──────────────────┘                               └─────────────────┘
        │
        │ Para endpoint /availability/
        │ Obtiene bloques de tiempo ocupados
```

---

## 10. CONFIGURACION NGINX GATEWAY

```nginx
server {
    listen 80;
    resolver 127.0.0.11;   # DNS interno Docker

    # Autenticacion → Accounts Service
    location ~ ^/api/auth/  { proxy_pass http://accounts:8000; }
    location ~ ^/api/users/ { proxy_pass http://accounts:8000; }

    # Espacios → Spaces Service
    location ~ ^/api/spaces/ { proxy_pass http://spaces:8000; }

    # Reservas → Reservations Service
    location ~ ^/api/reservations/ { proxy_pass http://reservations:8000; }

    # Cualquier otro /api/ → 404
    location /api/ { return 404; }
}
```

---

## 11. PUERTOS Y ACCESOS

| Servicio | Puerto Host | Puerto Contenedor | URL |
|----------|-------------|-------------------|-----|
| Frontend | 3000 | 80 | http://localhost:3000 |
| Gateway API | 8080 | 80 | http://localhost:8080/api/ |
| MySQL Accounts | 3307 | 3306 | localhost:3307 |
| MySQL Spaces | 3308 | 3306 | localhost:3308 |
| MySQL Reservations | 3309 | 3306 | localhost:3309 |

---

## 12. VARIABLES DE ENTORNO

```env
# JWT (compartido entre servicios)
JWT_SECRET=super-secret-jwt-change-in-production

# Admin bootstrap
ADMIN_EMAIL=adminlocal@fesc.edu.co
ADMIN_PASSWORD=FESC2025
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=Local

# Accounts Service
ACCOUNTS_DEBUG=0
ACCOUNTS_SECRET_KEY=change-me-accounts
ACCOUNTS_DB_NAME=accounts_db
ACCOUNTS_DB_USER=accounts_user
ACCOUNTS_DB_PASSWORD=accounts_pass

# Spaces Service
SPACES_DEBUG=0
SPACES_SECRET_KEY=change-me-spaces
SPACES_DB_NAME=spaces_db
SPACES_DB_USER=spaces_user
SPACES_DB_PASSWORD=spaces_pass

# Reservations Service
RESERVATIONS_DEBUG=0
RESERVATIONS_SECRET_KEY=change-me-reservations
RESERVATIONS_DB_NAME=reservations_db
RESERVATIONS_DB_USER=reservations_user
RESERVATIONS_DB_PASSWORD=reservations_pass

# Configuracion de reservas
RESERVATION_MIN_DURATION_MINUTES=30
RESERVATION_MAX_DURATION_HOURS=4
TIME_ZONE=America/Bogota
```

---

## 13. RESUMEN PARA EXPOSICION (5 minutos)

### Puntos Clave

1. **Arquitectura**: Microservicios 100% desacoplados con 3 APIs Django independientes

2. **Cada servicio tiene**:
   - Su propio Dockerfile
   - Su propia base de datos MySQL
   - Su propio dominio de responsabilidad

3. **Patrones de Diseno**:
   - API Gateway (NGINX)
   - Database per Service
   - JWT Stateless Authentication
   - Service Layer Pattern

4. **Tecnologias**: Python 3.11, Django 4.2, MySQL 8.0, Docker, NGINX

5. **Contenedores**: 7 en total (Frontend + Gateway + 3 APIs + 3 BDs)

6. **Comunicacion**: REST HTTP entre servicios, JWT compartido

7. **Tests**: pytest con fixtures, tests unitarios e integracion

---

## 14. DIAGRAMA RESUMEN

```
                    ┌─────────────────────────────────────┐
                    │           ARQUITECTURA              │
                    │      MICROSERVICIOS LIBAPARTADO     │
                    └─────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                        CAPA CLIENTE                            │
    │                   React + Vite (Puerto 3000)                   │
    └────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌────────────────────────────────────────────────────────────────┐
    │                      CAPA API GATEWAY                          │
    │                    NGINX (Puerto 8080)                         │
    │         Routing: /auth → accounts | /spaces → spaces           │
    │                  /reservations → reservations                  │
    └────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
    ┌──────────┐              ┌──────────┐              ┌──────────────┐
    │ ACCOUNTS │              │  SPACES  │              │ RESERVATIONS │
    │ SERVICE  │              │ SERVICE  │              │   SERVICE    │
    │ Django   │              │ Django   │              │   Django     │
    │ JWT Auth │              │ Catalog  │◄────────────►│   Booking    │
    └────┬─────┘              └────┬─────┘              └──────┬───────┘
         │                         │                           │
         ▼                         ▼                           ▼
    ┌──────────┐              ┌──────────┐              ┌──────────────┐
    │  MySQL   │              │  MySQL   │              │    MySQL     │
    │  :3307   │              │  :3308   │              │    :3309     │
    └──────────┘              └──────────┘              └──────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    PATRONES UTILIZADOS                         │
    │  • API Gateway          • Database per Service                 │
    │  • JWT Stateless        • Service Layer                        │
    │  • Repository (ORM)     • Factory (Tests)                      │
    └────────────────────────────────────────────────────────────────┘
```

---

*Documentacion generada para exposicion academica - Sistema LibApartado*
