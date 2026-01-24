#!/usr/bin/env python
"""
Script para crear el usuario administrador automáticamente desde variables de entorno.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'accounts_service.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
ADMIN_FIRST_NAME = os.getenv('ADMIN_FIRST_NAME', 'Admin')
ADMIN_LAST_NAME = os.getenv('ADMIN_LAST_NAME', 'Sistema')

if ADMIN_EMAIL and ADMIN_PASSWORD:
    if not User.objects.filter(email=ADMIN_EMAIL).exists():
        user = User.objects.create_user(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            first_name=ADMIN_FIRST_NAME,
            last_name=ADMIN_LAST_NAME,
            role='ADMIN'
        )
        user.is_superuser = True
        user.save()
        print(f"Usuario administrador creado: {ADMIN_EMAIL}")
    else:
        print(f"Usuario administrador ya existe: {ADMIN_EMAIL}")
else:
    print("Variables ADMIN_EMAIL y ADMIN_PASSWORD no configuradas, saltando creación de admin.")
