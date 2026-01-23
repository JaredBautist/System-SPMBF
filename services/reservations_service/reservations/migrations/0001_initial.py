# Generated manually for microservice schema
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('space_id', models.IntegerField()),
                ('space_name', models.CharField(max_length=255)),
                ('space_location', models.CharField(blank=True, max_length=255)),
                ('space_description', models.TextField(blank=True)),
                ('created_by_id', models.IntegerField()),
                ('created_by_email', models.EmailField(max_length=254)),
                ('created_by_first_name', models.CharField(blank=True, max_length=150)),
                ('created_by_last_name', models.CharField(blank=True, max_length=150)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('start_at', models.DateTimeField()),
                ('end_at', models.DateTimeField()),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('approved_by_id', models.IntegerField(blank=True, null=True)),
                ('approved_by_email', models.EmailField(blank=True, max_length=254)),
                ('approved_by_first_name', models.CharField(blank=True, max_length=150)),
                ('approved_by_last_name', models.CharField(blank=True, max_length=150)),
                ('decision_at', models.DateTimeField(blank=True, null=True)),
                ('decision_note', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['-start_at'],
            },
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['space_id', 'start_at'], name='IX_reservations_space_start'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['space_id', 'end_at'], name='IX_reservations_space_end'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['created_by_id', 'start_at'], name='IX_reservations_created_start'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['status', 'start_at'], name='IX_reservations_status_start'),
        ),
    ]

