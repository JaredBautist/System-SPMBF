from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.permissions import IsAdminRole
from accounts.serializers import UserSerializer

User = get_user_model()


class AccountTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token


class LoginView(TokenObtainPairView):
    serializer_class = AccountTokenObtainPairSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Login (JWT)",
        description="Entrega tokens JWT (access y refresh) para los roles ADMIN y TEACHER.",
        request=AccountTokenObtainPairSerializer,
        responses=AccountTokenObtainPairSerializer,
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshView(TokenRefreshView):
    @extend_schema(
        tags=["Auth"],
        summary="Refrescar token",
        description="Renueva el token de acceso usando el refresh token vigente.",
        request=TokenRefreshSerializer,
        responses=TokenRefreshSerializer,
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"], summary="Datos del usuario autenticado", responses=UserSerializer)
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=["Usuarios (Admin)"], summary="Listar usuarios"),
    retrieve=extend_schema(tags=["Usuarios (Admin)"], summary="Detalle de usuario"),
    create=extend_schema(tags=["Usuarios (Admin)"], summary="Crear usuario"),
    update=extend_schema(tags=["Usuarios (Admin)"], summary="Actualizar usuario"),
    partial_update=extend_schema(tags=["Usuarios (Admin)"], summary="Actualizar usuario (parcial)"),
    destroy=extend_schema(
        tags=["Usuarios (Admin)"],
        summary="Desactivar usuario",
        description="Soft-delete: marca al usuario como inactivo en lugar de eliminarlo.",
    ),
)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return instance

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

