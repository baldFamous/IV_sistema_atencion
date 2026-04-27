from django.shortcuts import render
from .utils import get_operational_datetime_info, get_current_day_counts


def admin_page(request):
    op_info_sync = get_operational_datetime_info() # Para pasar al template inicialmente
    # initial_counts = get_current_day_counts() # El WebSocket enviará esto

    context = {
        'officials_sae': [
            {'id': 1, 'name': 'Funcionario SAE 1 (MODULO 1)'},
            {'id': 2, 'name': 'Funcionario SAE 2 (MODULO 2)'},
            {'id': 3, 'name': 'Funcionario SAE 3 (MODULO 3)'},
        ],
        'officials_mineduc': [
            {'id': 4, 'name': 'Funcionario Ayuda Mineduc 1 (MODULO 4)'},
            {'id': 5, 'name': 'Funcionario Ayuda Mineduc 2 (MODULO 5)'},
            {'id': 6, 'name': 'Funcionario Ayuda Mineduc 3 (MODULO 6)'},
        ],
        'officials_becas': [
            {'id': 7, 'name': 'Funcionario Becas 1 (MODULO 7)'},
            {'id': 8, 'name': 'Funcionario Becas 2 (MODULO 8)'},
            {'id': 9, 'name': 'Funcionario Becas 3 (MODULO 9)'},
        ],
        'is_operational_initial': op_info_sync["is_operational"],
        'current_time_initial_str': op_info_sync["current_time_target_tz"].strftime('%Y-%m-%d %H:%M:%S %Z'),
        'operational_cutoff_str': op_info_sync["operational_cutoff_time_str"],
    }
    return render(request, 'turnos/admin_page.html', context)


def display_page(request):
    op_info_sync = get_operational_datetime_info()
    context = {
        'TARGET_TZ_STR': op_info_sync['target_tz_str'] if 'target_tz_str' in op_info_sync else '',
        'current_time_initial_str': op_info_sync["current_time_target_tz"].strftime('%Y-%m-%d %H:%M:%S %Z'),
        'operational_cutoff_str': op_info_sync["operational_cutoff_time_str"],
        'is_operational_initial': op_info_sync["is_operational"],
    }
    return render(request, 'turnos/display_page.html', context)

from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
from .models import RegistroAtencionDetalle

@csrf_exempt
def registrar_atencion_detalle(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Create a new record
            RegistroAtencionDetalle.objects.create(
                unit=data.get('unit'),
                official_id=data.get('official_id'),
                nombre_usuario=data.get('nombre_usuario', ''),
                rut_usuario=data.get('rut_usuario', ''),
                tramite=data.get('tramite'),
                respuesta=data.get('respuesta'),
                observaciones=data.get('observaciones', '')
            )
            return JsonResponse({'status': 'success', 'message': 'Atención registrada correctamente'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)