from django.urls import path
from . import views

app_name = 'turnos' # Buena práctica para namespacing

urlpatterns = [
    path('panel-funcionarios/', views.admin_page, name='admin_page'),
    path('visualizador/', views.display_page, name='display_page'),
    # Podrías añadir una URL raíz o redirigir a una de estas
    path('', views.display_page, name='home'), # Por ejemplo, el visualizador como home
]