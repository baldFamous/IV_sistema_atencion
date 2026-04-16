import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'atencion_publico.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack # Si necesitas autenticación en WebSockets
import turnos.routing # Importaremos esto más tarde

# application = get_asgi_application() # Aplicación HTTP por defecto

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack( # O simplemente URLRouter si no hay auth en WS
        URLRouter(
            turnos.routing.websocket_urlpatterns
        )
    ),
})