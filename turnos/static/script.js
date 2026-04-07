const wsStatusEl = document.getElementById('ws-status');
const errorEl = document.getElementById('error-message');
const statusEl = document.getElementById('status');
const saeCountEl = document.getElementById('sae-count');
const mineducCountEl = document.getElementById('mineduc-count');
const allActionButtons = document.querySelectorAll('button[data-official-id]');
const operationalStatusDisplayEl = document.getElementById('operational-status-display');
const currentTimeDisplayEl = document.getElementById('current-time-display');

let systemIsOperational = SYSTEM_OPERATIONAL;

function updateButtonStates() {
    allActionButtons.forEach(button => {
        button.disabled = !systemIsOperational;
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
updateButtonStates();

const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
const ws_path = `${ws_scheme}://${window.location.host}/ws/turnos/`;
const turnoSocket = new WebSocket(ws_path);

turnoSocket.onopen = function(e) {
    wsStatusEl.textContent = 'Conectado al servidor de turnos.';
    wsStatusEl.style.backgroundColor = '#d4edda';
    wsStatusEl.style.color = '#155724';
    wsStatusEl.style.borderColor = '#c3e6cb';
    errorEl.style.display = 'none';
    turnoSocket.send(JSON.stringify({'type': 'request_initial_counts'}));
};

turnoSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);

    if (data.type === 'update_counts') {
        saeCountEl.textContent = data.counts.SAE;
        mineducCountEl.textContent = data.counts.MINEDUC;
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
    wsStatusEl.textContent = 'Desconectado del servidor de turnos. Intentando reconectar...';
    wsStatusEl.style.backgroundColor = '#f8d7da';
    wsStatusEl.style.color = '#721c24';
    wsStatusEl.style.borderColor = '#f5c6cb';
    systemIsOperational = false;
    updateButtonStates();
    setTimeout(() => { window.location.reload(); }, 5000);
};

turnoSocket.onerror = function(err) {
    wsStatusEl.textContent = 'Error de conexión con el servidor de turnos.';
    wsStatusEl.style.backgroundColor = '#f8d7da';
    wsStatusEl.style.color = '#721c24';
    wsStatusEl.style.borderColor = '#f5c6cb';
    console.error('WebSocket Error:', err);
    systemIsOperational = false;
    updateButtonStates();
};

allActionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        
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

        if (this.disabled) {
            return;
        }

        const unit = this.dataset.unit;
        const officialId = this.dataset.officialId;

        this.disabled = true;
        const originalText = this.textContent;
        let countdown = 5;

        const updateButtonText = () => {
            this.textContent = `${originalText} (${countdown})`;
        };

        updateButtonText();

        const intervalId = setInterval(() => {
            countdown--;
            updateButtonText();
            
            if (countdown <= 0) {
                clearInterval(intervalId);
                this.textContent = originalText;
                if (systemIsOperational) {
                    this.disabled = false;
                }
            }
        }, 1000);

        turnoSocket.send(JSON.stringify({
            'type': 'increment_turno',
            'unit': unit,
            'official_id': officialId
        }));
    });
}); 