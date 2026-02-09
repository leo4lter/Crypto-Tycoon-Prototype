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
        const btnInspectorClose = document.getElementById('btn-inspector-close');
        if (btnInspectorClose) btnInspectorClose.onclick = () => { Store.selectedEntityId = null; };

        // Tooltip
        this.elTooltip = document.getElementById('tooltip');
        this.hoverTimer = 0;
        this.lastHoverKey = '';

        // Mouse Tracking
        this.mouseX = 0;
        this.mouseY = 0;
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

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
            toolText += ` [Rotar: ${CONFIG.CONTROLS.ROTATE.toUpperCase()}]`;
            
            this.elTool.innerText = toolText;
        }

        // 4. Inspector de Estructuras
        this.updateInspector();

        // 5. Tooltip Inteligente
        this.updateTooltip(dt);
    }

    updateTooltip(dt) {
        if (!this.elTooltip) return;

        const hover = Store.hover;
        const currentKey = `${hover.x},${hover.y}`;

        if (hover.x !== -1 && hover.valid !== undefined) {
             if (currentKey !== this.lastHoverKey) {
                 this.hoverTimer = 0;
                 this.lastHoverKey = currentKey;
                 this.hideTooltip();
             } else {
                 this.hoverTimer += dt;
             }
        } else {
            this.hoverTimer = 0;
            this.hideTooltip();
            return;
        }

        if (this.hoverTimer > 500) {
            this.showTooltip(hover.x, hover.y);
        }
    }

    showTooltip(gx, gy) {
        if (!this.elTooltip) return;

        const idx = gx + gy * Store.GRID;
        const temp = Store.heat[idx] || 0;
        let html = '';

        let color = '#fff';
        if (temp > 60) color = '#f59e0b'; // Naranja
        if (temp > 80) color = '#ef4444'; // Rojo

        html += `<div>Temp: <span style="color:${color}; font-weight:bold;">${temp.toFixed(1)}°C</span></div>`;

        const entities = this.game.ecs.getEntitiesWith('position').filter(id => {
            const p = this.game.ecs.components.position.get(id);
            return p.x === gx && p.y === gy;
        });

        if (entities.length > 0) {
            let name = '';
            if (entities.some(id => this.game.ecs.components.miner?.has(id))) name = 'Minero';
            else if (entities.some(id => this.game.ecs.components.rack?.has(id))) name = 'Rack';
            else if (entities.some(id => this.game.ecs.components.ac_unit?.has(id))) name = 'AC Suelo';
            else if (entities.some(id => this.game.ecs.components.wall_ac?.has(id))) name = 'AC Pared';
            else if (entities.some(id => this.game.ecs.components.cable?.has(id))) name = 'Cable';

            if (name) html += `<div style="color:#aaa; font-size:10px;">${name}</div>`;
        }

        this.elTooltip.innerHTML = html;
        this.elTooltip.style.left = `${this.mouseX + 15}px`;
        this.elTooltip.style.top = `${this.mouseY + 15}px`;
        this.elTooltip.classList.remove('hidden');
    }

    hideTooltip() {
        if (this.elTooltip) this.elTooltip.classList.add('hidden');
    }

    updateInspector() {
        if (!this.elInspector || !this.elInspectorContent) return;

        if (Store.selectedEntityId === null) {
            this.elInspector.classList.add('hidden');
            return;
        }

        let id = Store.selectedEntityId;
        if (!this.game.ecs.entities.has(id)) {
            Store.selectedEntityId = null;
            this.elInspector.classList.add('hidden');
            return;
        }

        // Si es un placeholder, seleccionamos al padre
        if (this.game.ecs.components.isPlaceholder && this.game.ecs.components.isPlaceholder.has(id)) {
             if (this.game.ecs.components.parent && this.game.ecs.components.parent.has(id)) {
                 id = this.game.ecs.components.parent.get(id).parentId;
                 Store.selectedEntityId = id;
                 if (!this.game.ecs.entities.has(id)) {
                    Store.selectedEntityId = null;
                    this.elInspector.classList.add('hidden');
                    return;
                 }
             }
        }

        this.elInspector.classList.remove('hidden');
        let html = '';

        if (this.game.ecs.components.miner.has(id)) {
            const m = this.game.ecs.components.miner.get(id);
            const p = this.game.ecs.components.position.get(id);
            const idx = p.x + p.y * Store.GRID;
            const temp = Store.heat[idx] || 0;
            const hasCarpet = this.game.simulationSystem.getCarpetAt(p.x, p.y);

            // Fix: Asegurar que variables usadas en template literals estén definidas

            html += `<div style="color:#00ff88; font-weight:bold;">${t('inspector.miner')} (Slot ${m.slotIndex || 0})</div>`;
            html += `<div>${t('inspector.status')}: <span style="color:${m.on ? '#0f0':'#f00'}">${t(m.on ? 'inspector.on' : 'inspector.off')}</span></div>`;
            html += `<div>${t('inspector.hashrate')}: ${m.hashrate} H/s</div>`;
            html += `<div>${t('inspector.consumption')}: ${m.watts} W</div>`;
            html += `<div>${t('inspector.temp')}: ${temp.toFixed(1)}°C ${hasCarpet ? `<span style="color:#f59e0b">${t('inspector.isolated')}</span>` : ''}</div>`;

            if (m.suffocating) {
                 html += `<div style="color:red; font-weight:bold; animation: pulse 0.5s infinite;">${t('inspector.suffocation')}</div>`;
                 html += `<div style="font-size:11px; color:#fca5a5;">${t('inspector.blocked_air')}</div>`;
            }

            if (m.broken) html += `<div style="color:red; font-weight:bold;">${t('inspector.broken')}</div>`;
        }
        else if (this.game.ecs.components.rack.has(id)) {
            const r = this.game.ecs.components.rack.get(id);
            html += `<div style="color:#fbbf24; font-weight:bold;">${t('inspector.rack')}</div>`;
            html += `<div>${t('inspector.slots')}: ${r.slots || 6}</div>`;
        }
        else if (this.game.ecs.components.cable.has(id)) {
             html += `<div style="color:#3b82f6; font-weight:bold;">${t('inspector.cable')}</div>`;
             html += `<div>${t('inspector.status')}: ${t('inspector.stable')}</div>`;
        }
        else if (this.game.ecs.components.ac_unit.has(id)) {
             html += `<div style="color:#60a5fa; font-weight:bold;">${t('inspector.ac_unit')}</div>`;
             html += `<div>${t('inspector.status')}: ${t('inspector.on')}</div>`;
        }
        else if (this.game.ecs.components.wall_ac.has(id)) {
             html += `<div style="color:#93c5fd; font-weight:bold;">${t('inspector.wall_ac')}</div>`;
             html += `<div>${t('inspector.status')}: ${t('inspector.on')}</div>`;
        }
        else {
            html += `<div style="color:#94a3b8;">${t('inspector.unknown')}</div>`;
            html += `<div>ID: ${id}</div>`;
        }

        this.elInspectorContent.innerHTML = html;
    }

    // ... (Métodos de configuración y bindings omitidos para brevedad en pensamiento, pero incluidos en escritura)
    toggleSettings(show) {
        if (!this.modal) return;

        if (show) {
            this.modal.classList.remove('hidden');
            this.generateKeyList();
            Store.isPaused = true;
        } else {
            this.modal.classList.add('hidden');
            Store.isPaused = false;
            this.waitingForKey = null;
            localStorage.setItem('CRYPTO_CONFIG_CONTROLS', JSON.stringify(CONFIG.CONTROLS));
        }
    }

    generateKeyList() {
        if (!this.keysList) return;
        this.keysList.innerHTML = '';
        for (const [action, key] of Object.entries(CONFIG.CONTROLS)) {
            const row = document.createElement('div');
            row.className = 'key-row';
            const label = document.createElement('span');
            label.innerText = t(`key.${action.toLowerCase()}`) || action;
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.innerText = key.toUpperCase();
            btn.onclick = () => this.startRebind(action, btn);
            row.appendChild(label);
            row.appendChild(btn);
            this.keysList.appendChild(row);
        }
    }

    startRebind(action, btnElement) {
        if (this.waitingForKey) {
            this.generateKeyList();
        }
        this.waitingForKey = action;
        btnElement.innerText = "???";
        btnElement.classList.add('waiting');
    }

    applyRebind(newKey) {
        if (!this.waitingForKey) return;
        CONFIG.CONTROLS[this.waitingForKey] = newKey;
        this.waitingForKey = null;
        this.generateKeyList();
    }

    resetDefaults() {
        localStorage.removeItem('CRYPTO_CONFIG_CONTROLS');
        window.location.reload();
    }
}
