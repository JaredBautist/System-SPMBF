from rest_framework.permissions import BasePermission


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'role', '').upper() == 'ADMIN':
            return True
        return obj.created_by_id == getattr(request.user, 'id', None)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', '').upper() == 'ADMIN'

