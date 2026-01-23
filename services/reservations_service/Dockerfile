FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY services/reservations_service /app

EXPOSE 8000
CMD ["gunicorn", "reservations_service.wsgi:application", "--bind", "0.0.0.0:8000"]
