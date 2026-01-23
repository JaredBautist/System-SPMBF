import os
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, 'change-me'),
    ALLOWED_HOSTS=(list, ['*']),
    DB_NAME=(str, 'reservations_db'),
    DB_USER=(str, 'reservations_user'),
    DB_PASSWORD=(str, 'reservations_pass'),
    DB_HOST=(str, 'reservations-db'),
    DB_PORT=(int, 3306),
    TIME_ZONE=(str, 'America/Bogota'),
    CORS_ALLOWED_ORIGINS=(list, ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:3001']),
    JWT_SECRET=(str, 'change-jwt-secret'),
    RESERVATION_MIN_DURATION_MINUTES=(int, 30),
    RESERVATION_MAX_DURATION_HOURS=(int, 4),
    SPACES_BASE_URL=(str, 'http://spaces:8000/api'),
)

environ.Env.read_env(env_file=os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env('DJANGO_DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'core',
    'reservations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'reservations_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'reservations_service.wsgi.application'
ASGI_APPLICATION = 'reservations_service.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}

LANGUAGE_CODE = 'es-co'
TIME_ZONE = env('TIME_ZONE')
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'reservations.authentication.JWTStatelessAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Reservations Service',
    'DESCRIPTION': 'Servicio de reservas desacoplado',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS')
JWT_SECRET = env('JWT_SECRET')
RESERVATION_MIN_DURATION_MINUTES = env('RESERVATION_MIN_DURATION_MINUTES')
RESERVATION_MAX_DURATION_HOURS = env('RESERVATION_MAX_DURATION_HOURS')
SPACES_BASE_URL = env('SPACES_BASE_URL')

