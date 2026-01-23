from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdminRole(BasePermission):
    """
    Allows access only to users with ADMIN role.
    """

    def has_permission(self, request, view):
        return bool(request.user and isinstance(request.user, User) and request.user.role == User.Role.ADMIN)
