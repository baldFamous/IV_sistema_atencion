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
                    button.style.backgroundColor = '#28a745';
                } else if (unit === 'MINEDUC') {
                    button.style.backgroundColor = '#ffc107';
                    button.style.color = '#333';
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
            saeCountEl.style.background = '#bfc94a'; // Tono más oscuro SAE
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
            mineducCountEl.style.background = '#3bb6c6'; // Tono más oscuro MINEDUC
            mineducCountEl.style.color = '#333';
            setTimeout(() => {
                mineducCountEl.style.background = '';
                mineducCountEl.style.color = '';
            }, 600);
        }
        if (isDisplayPage && becasChanged && becasCountEl) {
            beepAudio.currentTime = 0;
            beepAudio.play();
            becasCountEl.style.transition = 'background 0.3s, color 0.3s';
            becasCountEl.style.background = '#da1d79';
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
    });
});

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
        const officialId = this.dataset.officialId;

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
            'unit': unit,
            'official_id': officialId
        }));
    });
}); 