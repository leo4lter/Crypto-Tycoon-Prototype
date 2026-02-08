import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { t } from '../core/i18n.js';
import { HARDWARE_DB } from '../core/hardware.js'

export class UISystem {
    constructor() {
        this.elFPS = document.getElementById('ui-fps');
        this.elWatts = document.getElementById('ui-watts');
        
        // --- NUEVOS ELEMENTOS ---
        // Tendremos que agregarlos al HTML en el siguiente paso
        this.elMoney = document.getElementById('ui-money'); 
        this.elBTC = document.getElementById('ui-btc');

        this.elMode = document.getElementById('ui-mode');
        this.elTool = document.getElementById('ui-tool');
        
        this.lastRefresh = 0;
    }

    update(dt) {
        const now = performance.now();
        if (now - this.lastRefresh < 200) return;
        this.lastRefresh = now;

        this.elFPS.innerText = Math.round(1000 / dt);
        this.elWatts.innerText = Store.electricity.usedWatts.toLocaleString();

        // --- ACTUALIZAR ECONOMÍA ---
        if (this.elMoney) this.elMoney.innerText = `$ ${Store.economy.usd.toFixed(2)}`;
        if (this.elBTC) this.elBTC.innerText = `₿ ${Store.economy.btc.toFixed(6)}`;

        // ... (resto del código de modos igual)
        let modeText = t('ui.mode.layer.normal');
        if (Store.viewMode !== 'normal') {
            if (Store.viewMode === 'temperature') modeText = "VISIÓN TÉRMICA";
            if (Store.viewMode === 'noise') modeText = "MAPA DE RUIDO";
            if (Store.viewMode === 'dirt') modeText = "NIVEL DE SUCIEDAD";
            if (Store.viewMode === 'electricity') modeText = "RED ELÉCTRICA";
        } else if (Store.layerView !== 'normal') {
            modeText = t(`ui.mode.layer.${Store.layerView}`);
        }
        this.elMode.innerText = modeText;

        const toolKey = `build.${Store.buildMode}`;
        this.elTool.innerText = t(toolKey);
       
        let toolText = t(`build.${Store.buildMode}`);
        
        // Si estamos construyendo mineros, mostrar cuál
        if (Store.buildMode === 'miner') {
            const currentHw = HARDWARE_DB[Store.selectedHardwareIndex];
            toolText += ` [${currentHw.name} - $${currentHw.price}]`;
        }
        
        this.elTool.innerText = toolText;
    }
    
}