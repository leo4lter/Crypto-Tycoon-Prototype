import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { t } from '../core/i18n.js';
import { HARDWARE_DB } from '../core/hardware.js';

export class UISystem {
    constructor(game) {
        this.game = game;
        
        // Elementos HUD
        this.elFPS = document.getElementById('ui-fps');
        this.elWatts = document.getElementById('ui-watts');
        this.elMoney = document.getElementById('ui-money');
        this.elBTC = document.getElementById('ui-btc');
        this.elMode = document.getElementById('ui-mode');
        this.elTool = document.getElementById('ui-tool');

        // Elementos Inspector
        this.elInspector = document.getElementById('inspector-panel');
        this.elInspectorContent = document.getElementById('inspector-content');

        // Elementos del Menú de Configuración
        this.modal = document.getElementById('settings-modal');
        this.keysList = document.getElementById('keys-list');
        
        // Bindings de botones del menú (asegúrate de haber puesto el HTML en index.html)
        const btnClose = document.getElementById('btn-close');
        if (btnClose) btnClose.onclick = () => this.toggleSettings(false);
        
        const btnReset = document.getElementById('btn-reset');
        if (btnReset) btnReset.onclick = () => this.resetDefaults();

        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) btnSettings.onclick = () => this.toggleSettings(true);

        this.lastRefresh = 0;
        this.waitingForKey = null; // Variable para saber qué tecla estamos esperando cambiar
    }

    update(dt) {
        const now = performance.now();
        if (now - this.lastRefresh < 200) return;
        this.lastRefresh = now;

        // 1. Stats Básicas (Con validación de existencia)
        if (this.elFPS) this.elFPS.innerText = Math.round(1000 / dt);
        if (this.elWatts) this.elWatts.innerText = Store.electricity.usedWatts.toLocaleString();
        if (this.elMoney) this.elMoney.innerText = `$ ${Store.economy.usd.toFixed(2)}`;
        if (this.elBTC) this.elBTC.innerText = `₿ ${Store.economy.btc.toFixed(6)}`;

        // 2. Modo Visual
        // Seguridad: Solo intentamos actualizar si el elemento existe en el HTML
        if (this.elMode) {
            let modeText = t('ui.mode.layer.normal');
            
            if (Store.viewMode !== 'normal') {
                const C = CONFIG.CONTROLS;
                if (Store.viewMode === 'temperature') modeText = `[${C.VIEW_THERMAL}] TÉRMICA`;
                else if (Store.viewMode === 'electricity') modeText = `[${C.VIEW_ELECTRIC}] ELÉCTRICA`;
                else if (Store.viewMode === 'noise') modeText = `[${C.VIEW_NOISE}] RUIDO`;
                else if (Store.viewMode === 'dirt') modeText = `[${C.VIEW_DIRT}] SUCIEDAD`;
            } else if (Store.layerView !== 'normal') {
                modeText = t(`ui.mode.layer.${Store.layerView}`);
            }
            this.elMode.innerText = modeText;
        }

        // 3. Herramienta Actual
        if (this.elTool) {
            let toolText = t(`build.${Store.buildMode}`);
            if (Store.buildMode === 'miner') {
                const currentHw = HARDWARE_DB[Store.selectedHardwareIndex];
                if (currentHw) toolText += ` [${currentHw.name} - $${currentHw.price}]`;
            }
            // Mostrar tecla de rotación actual
            toolText += ` [Rotar: ${CONFIG.CONTROLS.ROTATE.toUpperCase()}]`;
            
            this.elTool.innerText = toolText;
        }

        // 4. Inspector de Estructuras
        this.updateInspector();
    }

    updateInspector() {
        if (!this.elInspector || !this.elInspectorContent) return;

        if (Store.selectedEntityId === null) {
            this.elInspector.classList.add('hidden');
            return;
        }

        const id = Store.selectedEntityId;
        // Verificar si la entidad aún existe
        if (!this.game.ecs.entities.has(id)) {
            Store.selectedEntityId = null;
            this.elInspector.classList.add('hidden');
            return;
        }

        this.elInspector.classList.remove('hidden');
        let html = '';

        if (this.game.ecs.components.miner.has(id)) {
            const m = this.game.ecs.components.miner.get(id);
            const p = this.game.ecs.components.position.get(id);
            const idx = p.x + p.y * Store.GRID;
            const temp = Store.heat[idx] || 0;

            html += `<div style="color:#00ff88; font-weight:bold;">MINERO (Slot ${m.slotIndex || 0})</div>`;
            html += `<div>Estado: <span style="color:${m.on ? '#0f0':'#f00'}">${m.on ? 'ENCENDIDO' : 'APAGADO/SIN ENERGÍA'}</span></div>`;
            html += `<div>Hashrate: ${m.hashrate} H/s</div>`;
            html += `<div>Consumo: ${m.watts} W</div>`;
            html += `<div>Temp Local: ${temp.toFixed(1)}°C</div>`;
            if (m.broken) html += `<div style="color:red; font-weight:bold;">¡ROTO! REPARAR... (WIP)</div>`;
        }
        else if (this.game.ecs.components.rack.has(id)) {
            const r = this.game.ecs.components.rack.get(id);
            html += `<div style="color:#fbbf24; font-weight:bold;">RACK DE SERVIDORES</div>`;
            html += `<div>Slots Totales: ${r.slots || 6}</div>`;
        }
        else if (this.game.ecs.components.cable.has(id)) {
             html += `<div style="color:#3b82f6; font-weight:bold;">CABLE DE ALTA TENSIÓN</div>`;
             html += `<div>Transmisión: ESTABLE</div>`;
        }
        else {
            html += `<div style="color:#94a3b8;">OBJETO DESCONOCIDO</div>`;
            html += `<div>ID: ${id}</div>`;
        }

        this.elInspectorContent.innerHTML = html;
    }

    // === LÓGICA DEL MENÚ DE CONFIGURACIÓN ===

    toggleSettings(show) {
        if (!this.modal) return;

        if (show) {
            this.modal.classList.remove('hidden');
            this.generateKeyList();
            Store.isPaused = true; // Pausa inputs del juego
        } else {
            this.modal.classList.add('hidden');
            Store.isPaused = false; // Reanuda juego
            this.waitingForKey = null;
            
            // Guardar persistencia
            localStorage.setItem('CRYPTO_CONFIG_CONTROLS', JSON.stringify(CONFIG.CONTROLS));
        }
    }

    generateKeyList() {
        if (!this.keysList) return;
        this.keysList.innerHTML = '';
        
        // Generar filas automáticamente basado en CONFIG
        for (const [action, key] of Object.entries(CONFIG.CONTROLS)) {
            const row = document.createElement('div');
            row.className = 'key-row';

            const label = document.createElement('span');
            // Usar i18n para el nombre de la acción
            label.innerText = t(`key.${action.toLowerCase()}`) || action;

            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.innerText = key.toUpperCase();
            
            // Al hacer clic, iniciamos el modo de espera
            btn.onclick = () => this.startRebind(action, btn);

            row.appendChild(label);
            row.appendChild(btn);
            this.keysList.appendChild(row);
        }
    }

    startRebind(action, btnElement) {
        if (this.waitingForKey) {
            this.generateKeyList(); // Reset visual si ya había uno pendiente
        }

        this.waitingForKey = action;
        btnElement.innerText = "???"; // Feedback visual
        btnElement.classList.add('waiting');
    }

    // Este método es llamado por InputSystem cuando presionas una tecla con el menú abierto
    applyRebind(newKey) {
        if (!this.waitingForKey) return;

        // Guardar nueva tecla en Config
        CONFIG.CONTROLS[this.waitingForKey] = newKey;
        
        this.waitingForKey = null;
        this.generateKeyList(); // Regenerar lista para mostrar el cambio
    }

    resetDefaults() {
        localStorage.removeItem('CRYPTO_CONFIG_CONTROLS');
        window.location.reload(); // Recargar página para restaurar config original
    }
}