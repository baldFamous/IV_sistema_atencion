console.log('Script iniciado');

const wsStatusEl = document.getElementById('ws-status');
const errorEl = document.getElementById('error-message');
const statusEl = document.getElementById('status');
const saeCountEl = document.getElementById('sae-count');
const mineducCountEl = document.getElementById('mineduc-count');
const allActionButtons = document.querySelectorAll('button[data-official-id]');
const operationalStatusDisplayEl = document.getElementById('operational-status-display');
const currentTimeDisplayEl = document.getElementById('current-time-display');
const becasCountEl = document.getElementById('becas-count');
const allRecallButtons = document.querySelectorAll('.recall-btn');

let systemIsOperational = SYSTEM_OPERATIONAL;

// Mantener un registro de los botones que están en proceso de conteo
const activeCountdowns = new Map();

// Inicializar audio beep
const beepAudio = new Audio('/static/beep.mp3');

let lastSaeCount = null;
let lastMineducCount = null;

function updateButtonStates() {
    allActionButtons.forEach(button => {
        button.disabled = !systemIsOperational || activeCountdowns.has(button);
    });
    operationalStatusDisplayEl.textContent = systemIsOperational ? 'Operacional' : 'Fuera de Horario';
    if (!systemIsOperational) {
        statusEl.textContent = 'Sistema fuera de horario. No se pueden registrar nuevas atenciones.';
        statusEl.style.display = 'block';
    } else {
         if (wsStatusEl.textContent.startsWith('Conectado')) {
            statusEl.textContent = '';
            statusEl.style.display = 'none';
         }
    }
}

function startButtonCountdown(button, unit) {
    if (activeCountdowns.has(button)) {
        return;
    }

    const originalText = button.textContent;
    let countdown = 5;
    
    // Deshabilitar el botón
    button.disabled = true;
    button.style.backgroundColor = '#dc3545';
    button.style.opacity = '0.8';
    
    // Guardar el intervalo en el Map
    const intervalId = setInterval(() => {
        countdown--;
        button.textContent = `${originalText} (${countdown})`;
        
        if (countdown <= 0) {
            clearInterval(intervalId);
            activeCountdowns.delete(button);
            button.textContent = originalText;
            
            if (systemIsOperational) {
                button.disabled = false;
                if (unit === 'SAE') {
                    button.style.backgroundColor = '#ffc107';
                    button.style.color = '#333';
                } else if (unit === 'MINEDUC') {
                    button.style.backgroundColor = '#00bcd4';
                    button.style.color = '#333';
                } else if (unit === 'BECAS') {
                    button.style.backgroundColor = '#d81b60';
                    button.style.color = 'white';
                }
                button.style.opacity = '1';
            }
        }
    }, 1000);
    
    activeCountdowns.set(button, intervalId);
}

updateButtonStates();

const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
const ws_path = `${ws_scheme}://${window.location.host}/ws/turnos/`;
const turnoSocket = new WebSocket(ws_path);

turnoSocket.onopen = function(e) {
    console.log('WebSocket conectado');
    wsStatusEl.textContent = 'Conectado al servidor de turnos.';
    wsStatusEl.style.backgroundColor = '#d4edda';
    wsStatusEl.style.color = '#155724';
    wsStatusEl.style.borderColor = '#c3e6cb';
    errorEl.style.display = 'none';
    turnoSocket.send(JSON.stringify({'type': 'request_initial_counts'}));
};

turnoSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log('Mensaje recibido:', data);

    if (data.type === 'update_counts') {
        // Detectar cambios y reproducir beep solo si cambia el número o hay un recall
        let saeChanged = (lastSaeCount !== null && lastSaeCount !== data.counts.SAE) || (data.counts.recall_unit === 'SAE');
        let mineducChanged = (lastMineducCount !== null && lastMineducCount !== data.counts.MINEDUC) || (data.counts.recall_unit === 'MINEDUC');
        let becasChanged = (typeof lastBecasCount !== 'undefined' && lastBecasCount !== null && lastBecasCount !== data.counts.BECAS) || (data.counts.recall_unit === 'BECAS');

        saeCountEl.textContent = data.counts.SAE;
        mineducCountEl.textContent = data.counts.MINEDUC;
        becasCountEl && (becasCountEl.textContent = data.counts.BECAS);

        const isDisplayPage = document.getElementById('display-page') !== null;

        if (isDisplayPage && saeChanged) {
            beepAudio.currentTime = 0;
            beepAudio.play();
            saeCountEl.style.transition = 'background 0.3s, color 0.3s';
            saeCountEl.style.background = '#e0a800'; // Tono más oscuro SAE
            saeCountEl.style.color = '#333';
            setTimeout(() => {
                saeCountEl.style.background = '';
                saeCountEl.style.color = '';
            }, 600);
        }
        if (isDisplayPage && mineducChanged) {
            beepAudio.currentTime = 0;
            beepAudio.play();
            mineducCountEl.style.transition = 'background 0.3s, color 0.3s';
            mineducCountEl.style.background = '#0097a7'; // Tono más oscuro MINEDUC
            mineducCountEl.style.color = '#fff';
            setTimeout(() => {
                mineducCountEl.style.background = '';
                mineducCountEl.style.color = '';
            }, 600);
        }
        if (isDisplayPage && becasChanged && becasCountEl) {
            beepAudio.currentTime = 0;
            beepAudio.play();
            becasCountEl.style.transition = 'background 0.3s, color 0.3s';
            becasCountEl.style.background = '#ad1457';
            becasCountEl.style.color = '#fff';
            setTimeout(() => {
                becasCountEl.style.background = '';
                becasCountEl.style.color = '';
            }, 600);
        }
        lastSaeCount = data.counts.SAE;
        lastMineducCount = data.counts.MINEDUC;
        if(typeof lastBecasCount !== 'undefined') lastBecasCount = data.counts.BECAS;
        systemIsOperational = data.counts.is_operational;
        statusEl.textContent = data.counts.message || (systemIsOperational ? 'Conteos actualizados.' : 'Fuera de horario.');
        statusEl.style.display = 'block';
        setTimeout(() => { if (systemIsOperational) {statusEl.textContent = ''; statusEl.style.display = 'none';} }, 3000);
        updateButtonStates();
    } else if (data.type === 'error_message') {
        errorEl.textContent = data.message;
        errorEl.style.display = 'block';
        setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
    }
};

turnoSocket.onclose = function(e) {
    console.log('WebSocket desconectado');
    wsStatusEl.textContent = 'Desconectado del servidor de turnos. Intentando reconectar...';
    wsStatusEl.style.backgroundColor = '#f8d7da';
    wsStatusEl.style.color = '#721c24';
    wsStatusEl.style.borderColor = '#f5c6cb';
    systemIsOperational = false;
    updateButtonStates();
    setTimeout(() => { window.location.reload(); }, 5000);
};

turnoSocket.onerror = function(err) {
    console.error('Error WebSocket:', err);
    wsStatusEl.textContent = 'Error de conexión con el servidor de turnos.';
    wsStatusEl.style.backgroundColor = '#f8d7da';
    wsStatusEl.style.color = '#721c24';
    wsStatusEl.style.borderColor = '#f5c6cb';
    systemIsOperational = false;
    updateButtonStates();
};

allActionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Botón clickeado:', this.textContent);
        
        if (activeCountdowns.has(this)) {
            console.log('Botón ya en proceso de conteo');
            return;
        }

        if (!systemIsOperational) {
            errorEl.textContent = "Acción no permitida: El sistema está fuera de horario.";
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
            return;
        }

        if (turnoSocket.readyState !== WebSocket.OPEN) {
            errorEl.textContent = "No conectado al servidor. Intente de nuevo más tarde.";
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
            return;
        }

        const unit = this.dataset.unit;
        const officialId = this.dataset.officialId;

        // Iniciar el conteo del botón
        startButtonCountdown(this, unit);

        // Enviar el mensaje al WebSocket
        turnoSocket.send(JSON.stringify({
            'type': 'increment_turno',
            'unit': unit,
            'official_id': officialId
        }));

        // Abrir modal de atención solo para SAE
        const modal = document.getElementById('atencion-modal');
        if (modal && unit === 'SAE') {
            document.getElementById('modal-unit').value = unit;
            document.getElementById('modal-official-id').value = officialId;
            modal.style.display = 'block';
        }
    });
});

// Lógica del modal
const modal = document.getElementById('atencion-modal');
const btnCancel = document.getElementById('btn-cancel-modal');
const formAtencion = document.getElementById('atencion-form');

if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => {
        modal.style.display = 'none';
        formAtencion.reset();
        resetMenores();
    });
}

// === Formateo automático de RUT (XX.XXX.XXX-X) ===
function formatRut(value) {
    // Limpiar todo excepto números y K/k
    let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    
    if (clean.length === 0) return '';
    
    // Separar cuerpo y dígito verificador
    let dv = clean.slice(-1);
    let body = clean.slice(0, -1);
    
    if (body.length === 0) return clean;
    
    // Agregar puntos al cuerpo
    let formatted = '';
    let count = 0;
    for (let i = body.length - 1; i >= 0; i--) {
        formatted = body[i] + formatted;
        count++;
        if (count % 3 === 0 && i > 0) {
            formatted = '.' + formatted;
        }
    }
    
    return formatted + '-' + dv;
}

function attachRutFormatter(input) {
    input.addEventListener('input', function() {
        const pos = this.selectionStart;
        const prevLen = this.value.length;
        this.value = formatRut(this.value);
        // Ajustar posición del cursor
        const newLen = this.value.length;
        const diff = newLen - prevLen;
        this.setSelectionRange(pos + diff, pos + diff);
    });
}

// Aplicar a todos los campos RUT existentes
document.querySelectorAll('.rut-input').forEach(input => {
    attachRutFormatter(input);
});

// === Lógica de Menores ===
let menoresCount = 1;
const menoresContainer = document.getElementById('menores-container');
const menoresCountDisplay = document.getElementById('menores-count');
const btnAddMenor = document.getElementById('btn-add-menor');
const btnRemoveMenor = document.getElementById('btn-remove-menor');

function createMenorEntry(index) {
    const div = document.createElement('div');
    div.className = 'menor-entry';
    div.dataset.index = index;
    div.innerHTML = `
        <div class="menor-entry-header">Menor ${index + 1}</div>
        <div class="menor-fields">
            <div class="field-group">
                <label>RUT del Menor:</label>
                <input type="text" name="menor_rut_${index}" class="rut-input" placeholder="Ej: 20.543.678-4">
            </div>
            <div class="field-group">
                <label>Curso del Menor:</label>
                <input type="text" name="menor_curso_${index}" placeholder="Ej: 1° Básico">
            </div>
        </div>
    `;
    // Adjuntar formateador de RUT al nuevo input
    const rutInput = div.querySelector('.rut-input');
    if (rutInput) attachRutFormatter(rutInput);
    return div;
}

function resetMenores() {
    menoresCount = 1;
    if (menoresCountDisplay) menoresCountDisplay.textContent = '1';
    if (menoresContainer) {
        menoresContainer.innerHTML = '';
        menoresContainer.appendChild(createMenorEntry(0));
    }
}

if (btnAddMenor) {
    btnAddMenor.addEventListener('click', () => {
        if (menoresCount >= 10) return; // Límite máximo
        menoresContainer.appendChild(createMenorEntry(menoresCount));
        menoresCount++;
        menoresCountDisplay.textContent = menoresCount;
    });
}

if (btnRemoveMenor) {
    btnRemoveMenor.addEventListener('click', () => {
        if (menoresCount <= 1) return; // Mínimo 1
        menoresContainer.removeChild(menoresContainer.lastElementChild);
        menoresCount--;
        menoresCountDisplay.textContent = menoresCount;
    });
}

if (formAtencion) {
    formAtencion.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Recopilar datos de menores usando data-index
        const menores = [];
        const entries = menoresContainer ? menoresContainer.querySelectorAll('.menor-entry') : [];
        entries.forEach((entry) => {
            const idx = entry.dataset.index;
            const rut = entry.querySelector(`input[name="menor_rut_${idx}"]`);
            const curso = entry.querySelector(`input[name="menor_curso_${idx}"]`);
            menores.push({
                rut: rut ? rut.value : '',
                curso: curso ? curso.value : ''
            });
        });

        const data = {
            unit: document.getElementById('modal-unit').value,
            official_id: document.getElementById('modal-official-id').value,
            nombre_apoderado: document.getElementById('modal-nombre').value,
            rut_apoderado: document.getElementById('modal-rut').value,
            telefono_apoderado: document.getElementById('modal-telefono') ? document.getElementById('modal-telefono').value : '',
            tramite: document.getElementById('modal-tramite').value,
            respuesta: document.getElementById('modal-respuesta').value,
            observaciones: document.getElementById('modal-observaciones').value,
            menores_data: menores
        };
        
        fetch('/atencion/api/registrar-atencion/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                statusEl.textContent = 'Atención registrada correctamente.';
                statusEl.style.display = 'block';
                setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
                modal.style.display = 'none';
                formAtencion.reset();
                resetMenores();
            } else {
                alert('Error al registrar atención: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión al registrar atención.');
        });
    });
}

allRecallButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Botón de repetir clickeado:', this.dataset.unit);

        if (!systemIsOperational) {
            errorEl.textContent = "Acción no permitida: El sistema está fuera de horario.";
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
            return;
        }

        if (turnoSocket.readyState !== WebSocket.OPEN) {
            errorEl.textContent = "No conectado al servidor. Intente de nuevo más tarde.";
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
            return;
        }

        const unit = this.dataset.unit;

        // Visual feedback
        const originalText = this.textContent;
        this.textContent = "🔊 Sonando...";
        this.disabled = true;
        setTimeout(() => {
            this.textContent = originalText;
            this.disabled = false;
        }, 1500);

        turnoSocket.send(JSON.stringify({
            'type': 'recall_turno',
            'unit': unit
        }));
    });
}); 