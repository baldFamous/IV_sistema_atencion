from django.db import models
from django.utils import timezone
import pytz

class Atencion(models.Model):
    UNIT_CHOICES = [
        ('SAE', 'SAE'),
        ('MINEDUC', 'Ayuda Mineduc'),
    ]
    # IDs de funcionarios: 1,2,3 para SAE; 4,5,6 para Ayuda Mineduc
    OFFICIAL_CHOICES = [
        (1, 'Funcionario SAE 1 (MODULO 1)'), (2, 'Funcionario SAE 2 (MODULO 2)'), (3, 'Funcionario SAE 3 (MODULO 3)'),
        (4, 'Funcionario Ayuda Mineduc 1 (MODULO 4)'), (5, 'Funcionario Ayuda Mineduc 2 (MODULO 5)'), (6, 'Funcionario Ayuda Mineduc 3 (MODULO 6)'),
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
