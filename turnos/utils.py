from django.utils import timezone
from django.db.models import Count
from .models import Atencion
import datetime
import pytz

# Usaremos Etc/GMT+4 para un GMT-4 fijo.
# Si necesitas que siga el horario de Chile (que tiene DST), usa 'America/Santiago'
# y ajusta la lógica de las 15:00 según corresponda.
TARGET_TZ_STR = 'Etc/GMT+4' # GMT-4 fijo
# TARGET_TZ_STR = 'America/Santiago' # Para hora Chilena con DST

def get_target_timezone():
    return pytz.timezone(TARGET_TZ_STR)

def get_operational_datetime_info():
    """
    Determina si el sistema está en horario operacional (hasta las 15:00 GMT-4)
    y devuelve los límites de tiempo para las consultas en UTC.
    """
    target_tz = get_target_timezone()
    current_time_target_tz = timezone.now().astimezone(target_tz)

    # El día operacional es el día actual en la zona horaria GMT-4
    operational_date_target_tz = current_time_target_tz.date()

    # Hora de inicio operacional: 00:00:00 del día actual en GMT-4
    start_op_dt_target_tz = target_tz.localize(
        datetime.datetime.combine(operational_date_target_tz, datetime.time.min)
    )
    # Hora de fin operacional: 15:00:00 del día actual en GMT-4
    end_op_dt_target_tz = target_tz.localize(
        datetime.datetime.combine(operational_date_target_tz, datetime.time(15, 00, 0))
    )

    is_operational_hours = current_time_target_tz < end_op_dt_target_tz

    # Convertir a UTC para consultas a la base de datos (asumiendo que DB guarda en UTC)
    query_start_utc = start_op_dt_target_tz.astimezone(pytz.utc)
    query_end_utc = end_op_dt_target_tz.astimezone(pytz.utc) # Este es el corte para las consultas del día

    return {
        "is_operational": is_operational_hours,
        "current_time_target_tz": current_time_target_tz,
        "operational_cutoff_time_str": end_op_dt_target_tz.strftime('%H:%M:%S %Z'),
        "query_start_utc": query_start_utc, # Para filtrar registros del día operacional actual
        "query_end_utc": query_end_utc,     # Límite superior para los registros del día
    }

def get_current_day_counts():
    """
    Calcula los conteos para SAE y Ayuda Mineduc para el día operacional actual.
    Si está fuera de horario, los contadores son 0.
    """
    op_info = get_operational_datetime_info()

    if not op_info["is_operational"]:
        return {
            'SAE': 0, 'MINEDUC': 0,
            'SAE_module': None,
            'MINEDUC_module': None,
            'is_operational': False,
            'message': f"Fuera de horario de atención (después de las {op_info['operational_cutoff_time_str']})."
        }

    # Obtener el último registro de atención para cada unidad
    latest_sae = Atencion.objects.filter(
        unit='SAE',
        timestamp__gte=op_info["query_start_utc"],
        timestamp__lt=op_info["query_end_utc"]
    ).order_by('-timestamp').first()

    latest_mineduc = Atencion.objects.filter(
        unit='MINEDUC',
        timestamp__gte=op_info["query_start_utc"],
        timestamp__lt=op_info["query_end_utc"]
    ).order_by('-timestamp').first()

    # Contar registros dentro de la ventana operacional actual
    counts_data = Atencion.objects.filter(
        timestamp__gte=op_info["query_start_utc"],
        timestamp__lt=op_info["query_end_utc"]
    ).values('unit').annotate(total=Count('id'))

    sae_total = 0
    mineduc_total = 0
    for item in counts_data:
        if item['unit'] == 'SAE':
            sae_total = item['total']
        elif item['unit'] == 'MINEDUC':
            mineduc_total = item['total']

    return {
        'SAE': sae_total,
        'MINEDUC': mineduc_total,
        'SAE_module': latest_sae.official_id if latest_sae else None,
        'MINEDUC_module': latest_mineduc.official_id if latest_mineduc else None,
        'is_operational': True,
        'message': f"En horario de atención (hasta las {op_info['operational_cutoff_time_str']})."
    }

def record_atencion_if_operational(unit, official_id_str):
    """
    Registra una atención si está dentro del horario operacional.
    Devuelve (True, mensaje_exito) o (False, mensaje_error).
    """
    op_info = get_operational_datetime_info()
    if not op_info["is_operational"]:
        return False, f"No se registró. Fuera de horario (límite {op_info['operational_cutoff_time_str']})."

    try:
        official_id = int(official_id_str)
    except ValueError:
        return False, "ID de funcionario inválido."

    # Validar que el official_id corresponda a la unidad
    is_sae_official = unit == 'SAE' and official_id in [1, 2, 3]
    is_mineduc_official = unit == 'MINEDUC' and official_id in [4, 5, 6]

    if not (is_sae_official or is_mineduc_official):
        return False, f"ID de funcionario {official_id} no es válido para la unidad {unit}."

    Atencion.objects.create(unit=unit, official_id=official_id) # timestamp se guarda en UTC
    return True, "Atención registrada exitosamente."