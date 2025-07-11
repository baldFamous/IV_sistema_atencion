from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView # Para la URL raíz

urlpatterns = [
    path('admin/', admin.site.urls),
    path('atencion/', include('turnos.urls')),
    # Redirigir la raíz a la página de visualización, por ejemplo
    path('', RedirectView.as_view(pattern_name='turnos:display_page', permanent=False)),
]