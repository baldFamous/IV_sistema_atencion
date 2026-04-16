#!/bin/bash

# Configurar el entorno
export DJANGO_SETTINGS_MODULE="atencion_publico.settings"
export PYTHONPATH="."

# Activar el entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Instalar dependencias si no están instaladas
pip install channels daphne whitenoise

# Inicializar Django
python3 -c "import django; django.setup()"

# Ejecutar el servidor
echo "Iniciando servidor en http://localhost:8000"
echo "Presiona Ctrl+C para detener el servidor"

# Opciones de Daphne:
# -b 0.0.0.0: Escucha en todas las interfaces
# -p 8000: establece puerto 8000
# --websocket-timeout xx: Tiempo de espera entre peticiones con WebSocket
# --proxy-headers: Para manejar los headers del proxy
# --access-log -: Mostrar los logs de acceso
# --verbosity 1: Nivel de verbosidad moderado

daphne -b 0.0.0.0 -p 8000 --proxy-headers --access-log - --verbosity 1 atencion_publico.asgi:application

