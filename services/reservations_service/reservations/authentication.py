import jwt
from django.conf import settings
from rest_framework import authentication, exceptions


class StatelessUser:
    def __init__(self, user_id=None, email=None, role=None, first_name=None, last_name=None):
        self.id = user_id
        self.email = email
        self.role = role
        self.first_name = first_name or ''
        self.last_name = last_name or ''

    @property
    def is_authenticated(self):
        return True


class JWTStatelessAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()
        if not auth_header or auth_header[0].lower() != b'bearer':
            return None
        if len(auth_header) != 2:
            raise exceptions.AuthenticationFailed('Invalid Authorization header')
        token = auth_header[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        except jwt.PyJWTError:
            raise exceptions.AuthenticationFailed('Invalid or expired token')
        user = StatelessUser(
            user_id=payload.get('user_id'),
            email=payload.get('email'),
            role=payload.get('role'),
            first_name=payload.get('first_name'),
            last_name=payload.get('last_name'),
        )
        return (user, None)

