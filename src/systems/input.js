import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { screenToGrid } from '../renderer/isometric.js';
import { t } from '../core/i18n.js';
import { HARDWARE_DB } from '../core/hardware.js';

export class InputSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.ecs = game.ecs;

        window.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('mousedown', (e) => this.handleMouse(e));
        window.addEventListener('keydown', (e) => this.handleKey(e));
    }

    handleKey(e) {
        const k = e.key; // La tecla presionada
        const C = CONFIG.CONTROLS; // Atajo para escribir menos

        // --- VISTAS (F1 - F5) ---
        if (k === C.VIEW_NORMAL) { Store.viewMode = 'normal'; Store.layerView = 'normal'; }
        if (k === C.VIEW_THERMAL) { Store.viewMode = 'temperature'; Store.layerView = 'normal'; }
        if (k === C.VIEW_ELECTRIC) { Store.viewMode = 'electricity'; Store.layerView = 'normal'; }
        if (k === C.VIEW_NOISE) { Store.viewMode = 'noise'; Store.layerView = 'normal'; }
        if (k === C.VIEW_DIRT) { Store.viewMode = 'dirt'; Store.layerView = 'normal'; }

        // --- CAPAS (1 - 4) ---
        if (k === C.LAYER_NORMAL) { Store.layerView = 'normal'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_SUBSOIL) { Store.layerView = 'subsoil'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_GROUND) { Store.layerView = 'ground'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_STRUCTURE) { Store.layerView = 'structure'; Store.viewMode = 'normal'; }

        // --- HERRAMIENTAS ---
        if (k === C.TOOL_MINER) Store.buildMode = 'miner';
        if (k === C.TOOL_RACK) Store.buildMode = 'rack';
        if (k === C.TOOL_CABLE) Store.buildMode = 'cable';
        if (k === C.TOOL_PANEL) Store.buildMode = 'panel';
        if (k === C.TOOL_CLEANER) Store.buildMode = 'cleaner';
        if (k === C.TOOL_CARPET) Store.buildMode = 'carpet';

        // --- ACCIONES ---
        if (k === C.CYCLE_HW) {
            e.preventDefault();
            Store.selectedHardwareIndex++;
            if (Store.selectedHardwareIndex >= HARDWARE_DB.length) {
                Store.selectedHardwareIndex = 0;
            }
        }

        // ROTACIÓN (Ahora sin conflictos)
        if (k.toLowerCase() === C.ROTATE.toLowerCase()) {
            Store.buildRotation = (Store.buildRotation + 1) % 4;
            console.log("Rotación:", Store.buildRotation);
        }
    }

    handleMouse(e) {
        const rect = this.ctx.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const { gx, gy } = screenToGrid(mx, my);

        if (gx < 0 || gy < 0 || gx >= Store.GRID || gy >= Store.GRID) return;

        const entitiesHere = this.ecs.getEntitiesWith('position').filter(id => {
            const p = this.ecs.components.position.get(id);
            return p.x === gx && p.y === gy;
        });

        const hasSubsoil = entitiesHere.some(id => this.ecs.components.cable?.has(id));
        const hasGround = entitiesHere.some(id => this.ecs.components.carpet?.has(id));
        const hasRack = entitiesHere.some(id => this.ecs.components.rack?.has(id));
        
        // Contamos mineros existentes para calcular el slot
        const minersHereCount = entitiesHere.filter(id => this.ecs.components.miner?.has(id)).length;
        
        const hasObstacle = entitiesHere.some(id => 
            this.ecs.components.panel?.has(id) || 
            this.ecs.components.cleaner?.has(id)
        );

        // Click Derecho: Borrar (Prioridad LIFO: Último minero -> Rack -> Otros)
        if (e.button === 2) {
            // 1. Intentar borrar el minero más alto
            const miners = entitiesHere.filter(id => this.ecs.components.miner?.has(id));
            if (miners.length > 0) {
                // Ordenar por slotIndex descendente para borrar el de arriba
                miners.sort((a, b) => {
                    const mA = this.ecs.components.miner.get(a);
                    const mB = this.ecs.components.miner.get(b);
                    return (mB.slotIndex || 0) - (mA.slotIndex || 0);
                });
                this.ecs.removeEntity(miners[0]);
                return;
            }
            
            // 2. Si no hay mineros, borrar rack u otros
            const toDelete = entitiesHere.find(id => !this.ecs.components.socket?.has(id));
            if (toDelete) this.ecs.removeEntity(toDelete);
            return;
        }

        this.tryBuild(gx, gy, hasSubsoil, hasGround, minersHereCount, hasRack, hasObstacle);
    }

    tryBuild(gx, gy, hasSubsoil, hasGround, minersHereCount, hasRack, hasObstacle) {
        const mode = Store.buildMode;

        if (mode === 'cable' && !hasSubsoil) {
            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'cable', {});
        }
        else if (mode === 'rack') {
            // REGLA: No construir Rack sobre mineros existentes ni sobre otro rack/obstáculo
            if (minersHereCount > 0 || hasRack || hasObstacle) {
                console.log("Espacio ocupado. Limpia antes de poner un Rack.");
                return; 
            }
            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'rack', { slots: 6 });
        }
        else if (mode === 'miner') {
            if (hasObstacle) return;

            let currentSlot = 0;

            if (hasRack) {
                // Si hay rack, permitimos hasta 6 (Slots 0-5)
                if (minersHereCount >= 6) {
                    console.log("Rack lleno.");
                    return;
                }
                currentSlot = minersHereCount;
            } else {
                // Si NO hay rack, solo permitimos 1 en el suelo
                if (minersHereCount >= 1) {
                    console.log("Necesitas un Rack para apilar.");
                    return;
                }
                currentSlot = 0;
            }

            const stats = HARDWARE_DB[Store.selectedHardwareIndex];

            if (Store.economy.usd < stats.price) {
                console.log("Fondos insuficientes");
                return;
            }
            Store.economy.usd -= stats.price;

            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'miner', { 
                watts: stats.watts, 
                heatOutput: stats.heat,
                hashrate: stats.hashrate,
                on: false,
                modelColor: stats.color,
                rotation: Store.buildRotation,
                slotIndex: currentSlot // Guardamos la altura
            });
        }
        else if (mode === 'carpet' && !hasGround) {
            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'carpet', { noiseReduction: 0.6 });
        }
        else if (mode === 'cleaner') {
            if (minersHereCount > 0 || hasRack || hasObstacle) return;
            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'cleaner', { power: 0.05 });
        }
        else if (mode === 'panel') {
            if (minersHereCount > 0 || hasRack || hasObstacle) return;
            const id = this.ecs.createEntity();
            this.ecs.addComponent(id, 'position', { x: gx, y: gy });
            this.ecs.addComponent(id, 'panel', { absorption: 0.85 });
        }
    }
}