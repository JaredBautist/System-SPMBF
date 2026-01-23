from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(getattr(request.user, 'role', '').upper() == 'ADMIN')

