from django.db import models
from django.utils import timezone
import pytz

class Atencion(models.Model):
    UNIT_CHOICES = [
        ('SAE', 'SAE'),
        ('MINEDUC', 'Ayuda Mineduc'),
        ('BECAS', 'Becas'),
    ]
    # IDs de funcionarios: 1,2,3 para SAE; 4,5,6 para Ayuda Mineduc; 7,8,9 para Becas
    OFFICIAL_CHOICES = [
        (1, 'Funcionario SAE 1 (MODULO 1)'), (2, 'Funcionario SAE 2 (MODULO 2)'), (3, 'Funcionario SAE 3 (MODULO 3)'),
        (4, 'Funcionario Ayuda Mineduc 1 (MODULO 4)'), (5, 'Funcionario Ayuda Mineduc 2 (MODULO 5)'), (6, 'Funcionario Ayuda Mineduc 3 (MODULO 6)'),
        (7, 'Funcionario Becas 1 (MODULO 7)'), (8, 'Funcionario Becas 2 (MODULO 8)'), (9, 'Funcionario Becas 3 (MODULO 9)'),
    ]

    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, verbose_name="Unidad")
    official_id = models.IntegerField(choices=OFFICIAL_CHOICES, verbose_name="ID Funcionario")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Fecha y Hora (UTC)")

    def __str__(self):
        return f"{self.get_unit_display()} - Oficial {self.official_id} ({self.timestamp_gmt_minus_4().strftime('%Y-%m-%d %H:%M:%S')})"

    def timestamp_gmt_minus_4(self):
        # GMT-4 es un offset fijo. 'Etc/GMT+4' es la designación IANA para GMT-4.
        # Si te refieres a la hora de Chile que puede ser GMT-3 o GMT-4 por DST, usa 'America/Santiago'.
        # Como la solicitud dice explícitamente GMT-4:
        gmt_minus_4_tz = pytz.timezone('Etc/GMT+4')
        return self.timestamp.astimezone(gmt_minus_4_tz)

    class Meta:
        verbose_name = "Registro de Atención"
        verbose_name_plural = "Registros de Atención"
        ordering = ['-timestamp']

class Recepcion(models.Model):
    unit = models.CharField(max_length=10, choices=Atencion.UNIT_CHOICES, verbose_name="Unidad")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Fecha y Hora (UTC)")

    def __str__(self):
        return f"Recepción {self.get_unit_display()} ({self.timestamp_gmt_minus_4().strftime('%Y-%m-%d %H:%M:%S')})"

    def timestamp_gmt_minus_4(self):
        gmt_minus_4_tz = pytz.timezone('Etc/GMT+4')
        return self.timestamp.astimezone(gmt_minus_4_tz)

    class Meta:
        verbose_name = "Registro de Recepción"
        verbose_name_plural = "Registros de Recepción"
        ordering = ['-timestamp']

class RegistroAtencionDetalle(models.Model):
    TRAMITE_CHOICES = [
        ('cambio_establecimiento', 'Cambio de establecimiento'),
        ('solicita_establecimiento', 'Solicita establecimiento'),
        ('reclamo', 'Reclamo'),
        ('consulta_general', 'Consulta general'),
        ('otro', 'Otro'),
    ]

    RESPUESTA_CHOICES = [
        ('realizo_solicitado', 'Realizó lo solicitado'),
        ('no_disponible', 'Solicitud no disponible'),
        ('se_deriva', 'Se deriva'),
        ('informacion_entregada', 'Información entregada'),
        ('otro', 'Otro'),
    ]

    unit = models.CharField(max_length=10, choices=Atencion.UNIT_CHOICES, verbose_name="Unidad")
    official_id = models.IntegerField(choices=Atencion.OFFICIAL_CHOICES, verbose_name="ID Funcionario")
    nombre_usuario = models.CharField(max_length=150, verbose_name="Nombre del Usuario", blank=True, null=True)
    rut_usuario = models.CharField(max_length=20, verbose_name="RUT", blank=True, null=True)
    tramite = models.CharField(max_length=50, choices=TRAMITE_CHOICES, verbose_name="Trámite")
    respuesta = models.CharField(max_length=50, choices=RESPUESTA_CHOICES, verbose_name="Respuesta")
    observaciones = models.TextField(blank=True, null=True, verbose_name="Observaciones")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Fecha y Hora (UTC)")

    def __str__(self):
        return f"Detalle Atención {self.get_unit_display()} - Funcionario {self.official_id} - {self.rut_usuario}"

    def timestamp_gmt_minus_4(self):
        gmt_minus_4_tz = pytz.timezone('Etc/GMT+4')
        return self.timestamp.astimezone(gmt_minus_4_tz)

    class Meta:
        verbose_name = "Detalle de Atención"
        verbose_name_plural = "Detalles de Atención"
        ordering = ['-timestamp']