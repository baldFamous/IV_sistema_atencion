import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.core.exceptions import ValidationError

from .utils import get_current_day_counts, record_atencion_if_operational, get_operational_datetime_info, record_recepcion_if_operational

class TurnoConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = 'turnos_publicos' # Nombre del grupo para broadcast
    TIMEOUT = 10  # segundos

    async def connect(self):
        try:
            await self.channel_layer.group_add(
                self.GROUP_NAME,
                self.channel_name
            )
            await self.accept()
            # Enviar conteos iniciales al conectar
            initial_counts = await asyncio.wait_for(
                sync_to_async(get_current_day_counts)(),
                timeout=self.TIMEOUT
            )
            await self.send(text_data=json.dumps({
                'type': 'update_counts',
                'counts': initial_counts
            }))
        except asyncio.TimeoutError:
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': 'Error: La operación tardó demasiado en completarse'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': f'Error de conexión: {str(e)}'
            }))

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.GROUP_NAME,
                self.channel_name
            )
        except Exception as e:
            print(f"Error en disconnect: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action_type = data.get('type')

            if action_type == 'increment_turno':
                unit = data.get('unit')
                official_id = data.get('official_id')

                # Intentar registrar la atención con timeout
                success, message = await asyncio.wait_for(
                    sync_to_async(record_atencion_if_operational)(unit, official_id),
                    timeout=self.TIMEOUT
                )

                if not success:
                    await self.send(text_data=json.dumps({
                        'type': 'error_message',
                        'message': message
                    }))
                else:
                    current_counts = await asyncio.wait_for(
                        sync_to_async(get_current_day_counts)(),
                        timeout=self.TIMEOUT
                    )
                    await self.channel_layer.group_send(
                        self.GROUP_NAME,
                        {
                            'type': 'broadcast_counts',
                            'counts': current_counts
                        }
                    )
            elif action_type == 'increment_recepcion':
                unit = data.get('unit')
                
                success, message = await asyncio.wait_for(
                    sync_to_async(record_recepcion_if_operational)(unit),
                    timeout=self.TIMEOUT
                )

                if not success:
                    await self.send(text_data=json.dumps({
                        'type': 'error_message',
                        'message': message
                    }))
                else:
                    current_counts = await asyncio.wait_for(
                        sync_to_async(get_current_day_counts)(),
                        timeout=self.TIMEOUT
                    )
                    await self.channel_layer.group_send(
                        self.GROUP_NAME,
                        {
                            'type': 'broadcast_counts',
                            'counts': current_counts
                        }
                    )
            elif action_type == 'recall_turno':
                unit = data.get('unit')
                
                # Fetch current counts
                current_counts = await asyncio.wait_for(
                    sync_to_async(get_current_day_counts)(),
                    timeout=self.TIMEOUT
                )

                current_counts['recall'] = True
                current_counts['recall_unit'] = unit

                await self.channel_layer.group_send(
                    self.GROUP_NAME,
                    {
                        'type': 'broadcast_counts',
                        'counts': current_counts
                    }
                )
            elif action_type == 'request_initial_counts':
                initial_counts = await asyncio.wait_for(
                    sync_to_async(get_current_day_counts)(),
                    timeout=self.TIMEOUT
                )
                await self.send(text_data=json.dumps({
                    'type': 'update_counts',
                    'counts': initial_counts
                }))
        except asyncio.TimeoutError:
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': 'Error: La operación tardó demasiado en completarse'
            }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': 'Error: Datos inválidos recibidos'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': f'Error inesperado: {str(e)}'
            }))

    # Método para manejar los mensajes enviados al grupo
    async def broadcast_counts(self, event):
        try:
            counts_data = event['counts']
            await self.send(text_data=json.dumps({
                'type': 'update_counts',
                'counts': counts_data
            }))
        except Exception as e:
            print(f"Error en broadcast_counts: {str(e)}")

    async def error_message(self, event): # Para manejar un tipo de mensaje de error si se hace broadcast
        try:
            message = event['message']
            await self.send(text_data=json.dumps({
                'type': 'error_message',
                'message': message
            }))
        except Exception as e:
            print(f"Error en error_message: {str(e)}")