from django.contrib import admin
from .models import Atencion

@admin.register(Atencion)
class AtencionAdmin(admin.ModelAdmin):
    list_display = ('unit', 'official_id', 'get_timestamp_gmt_minus_4_display', 'id')
    list_filter = ('unit', 'official_id', 'timestamp')
    search_fields = ('unit', 'official_id')
    readonly_fields = ('timestamp',) # El timestamp se establece automáticamente

    @admin.display(description='Fecha y Hora (GMT-4)', ordering='timestamp')
    def get_timestamp_gmt_minus_4_display(self, obj):
        return obj.timestamp_gmt_minus_4().strftime("%Y-%m-%d %H:%M:%S %Z")