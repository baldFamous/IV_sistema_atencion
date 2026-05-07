from django.contrib import admin
from .models import Atencion, Recepcion, RegistroAtencionDetalle

@admin.register(Atencion)
class AtencionAdmin(admin.ModelAdmin):
    list_display = ('unit', 'official_id', 'get_timestamp_gmt_minus_4_display', 'id')
    list_filter = ('unit', 'official_id', 'timestamp')
    search_fields = ('unit', 'official_id')
    readonly_fields = ('timestamp',) # El timestamp se establece automáticamente

    @admin.display(description='Fecha y Hora (GMT-4)', ordering='timestamp')
    def get_timestamp_gmt_minus_4_display(self, obj):
        return obj.timestamp_gmt_minus_4().strftime("%Y-%m-%d %H:%M:%S %Z")

@admin.register(Recepcion)
class RecepcionAdmin(admin.ModelAdmin):
    list_display = ('unit', 'get_timestamp_gmt_minus_4_display', 'id')
    list_filter = ('unit', 'timestamp')
    readonly_fields = ('timestamp',)

    @admin.display(description='Fecha y Hora (GMT-4)', ordering='timestamp')
    def get_timestamp_gmt_minus_4_display(self, obj):
        return obj.timestamp_gmt_minus_4().strftime("%Y-%m-%d %H:%M:%S %Z")

@admin.register(RegistroAtencionDetalle)
class RegistroAtencionDetalleAdmin(admin.ModelAdmin):
    list_display = ('unit', 'official_id', 'nombre_apoderado', 'rut_apoderado', 'telefono_apoderado', 'tramite', 'respuesta', 'get_timestamp_gmt_minus_4_display')
    list_filter = ('unit', 'official_id', 'tramite', 'respuesta')
    search_fields = ('rut_apoderado', 'nombre_apoderado')
    readonly_fields = ('timestamp',)

    @admin.display(description='Fecha y Hora (GMT-4)', ordering='timestamp')
    def get_timestamp_gmt_minus_4_display(self, obj):
        return obj.timestamp_gmt_minus_4().strftime("%Y-%m-%d %H:%M:%S %Z")