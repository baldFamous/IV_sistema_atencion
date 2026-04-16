import sqlite3
from datetime import datetime

# Rutas a tus dos bases de datos (adaptadas a tus rutas en el servidor)
db_main = 'db.sqlite3' # Ya que lo ejecutaremos dentro de la carpeta IV_sistema_atencion
db_pruebas = '../pruebas/IV_sistema_atencion/db.sqlite3'

try:
    print("Conectando a las bases de datos...")
    con_main = sqlite3.connect(db_main)
    con_pruebas = sqlite3.connect(db_pruebas)

    cur_main = con_main.cursor()
    cur_pruebas = con_pruebas.cursor()

    # Vamos a buscar TODOS los registros en pruebas creados HOY (ajusta la fecha si es necesario)
    fecha_hoy = '2026-04-16' # <-- ATENCIÓN: Solo cruzará datos de esta fecha en adelante

    # -- 1. Migrar Atenciones --
    cur_pruebas.execute("SELECT unit, official_id, timestamp FROM turnos_atencion WHERE timestamp LIKE ?", (fecha_hoy + '%',))
    atenciones_nuevas = cur_pruebas.fetchall()

    for atencion in atenciones_nuevas:
        # Se insertan SIN "id", obligando a SQLite de la rama main a entregarles un ID nuevo a los de hoy
        cur_main.execute("INSERT INTO turnos_atencion (unit, official_id, timestamp) VALUES (?, ?, ?)", atencion)
    
    print(f"[{len(atenciones_nuevas)}] Registros de Atención de hoy migrados a main.")

    # -- 2. Migrar Recepciones --
    cur_pruebas.execute("SELECT unit, timestamp FROM turnos_recepcion WHERE timestamp LIKE ?", (fecha_hoy + '%',))
    recepciones_nuevas = cur_pruebas.fetchall()

    for recepcion in recepciones_nuevas:
        # Igual aquí, insertar sin "id"
        cur_main.execute("INSERT INTO turnos_recepcion (unit, timestamp) VALUES (?, ?)", recepcion)

    print(f"[{len(recepciones_nuevas)}] Registros de Recepción de hoy migrados a main.")

    # Guardar cambios
    con_main.commit()
    print("¡Fusión de datos completada con éxito!")

except Exception as e:
    print(f"Ocurrió un error: {e}")
finally:
    con_main.close()
    con_pruebas.close()
