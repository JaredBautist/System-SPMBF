from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from spaces.models import Space


class Command(BaseCommand):
    help = "Seed database with initial data"

    def handle(self, *args, **options):
        User = get_user_model()
        admin_email = "admin@fesc.local"
        teacher_email = "teacher@fesc.local"

        admin, created = User.objects.get_or_create(email=admin_email, defaults={"role": User.Role.ADMIN})
        if created:
            admin.set_password("Admin123!")
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin {admin_email} / Admin123!"))
        else:
            self.stdout.write(f"Admin {admin_email} already exists")

        teacher, created = User.objects.get_or_create(email=teacher_email, defaults={"role": User.Role.TEACHER})
        if created:
            teacher.set_password("Teacher123!")
            teacher.save()
            self.stdout.write(self.style.SUCCESS(f"Created teacher {teacher_email} / Teacher123!"))
        else:
            self.stdout.write(f"Teacher {teacher_email} already exists")

        space, created = Space.objects.get_or_create(name="Módulo 3")
        if created:
            self.stdout.write(self.style.SUCCESS("Created Space 'Módulo 3'"))
        else:
            self.stdout.write("Space 'Módulo 3' already exists")
