import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { screenToGrid } from '../renderer/isometric.js';
import { HARDWARE_DB } from '../core/hardware.js';

export class InputSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.ecs = game.ecs;

        window.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mousedown', (e) => this.handleMouse(e));
        window.addEventListener('keydown', (e) => this.handleKey(e));
    }

    handleKey(e) {
        // Interceptar si estamos rebindeando una tecla en el menú de UI
        if (this.game.uiSystem.waitingForKey) {
            this.game.uiSystem.applyRebind(e.key);
            e.stopPropagation();
            return;
        }

        if (e.key === 'Escape') {
            Store.buildMode = null;
            Store.hover.valid = false;
            // Cerrar inspector si está abierto
            if (Store.selectedEntityId !== null) Store.selectedEntityId = null;
        }

        const k = e.key;
        const C = CONFIG.CONTROLS;

        if (k === C.VIEW_NORMAL) { Store.viewMode = 'normal'; Store.layerView = 'normal'; }
        if (k === C.VIEW_THERMAL) { Store.viewMode = 'temperature'; Store.layerView = 'normal'; }
        if (k === C.VIEW_ELECTRIC) { Store.viewMode = 'electricity'; Store.layerView = 'normal'; }
        if (k === C.VIEW_NOISE) { Store.viewMode = 'noise'; Store.layerView = 'normal'; }
        if (k === C.VIEW_DIRT) { Store.viewMode = 'dirt'; Store.layerView = 'normal'; }

        if (k === C.LAYER_NORMAL) { Store.layerView = 'normal'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_SUBSOIL) { Store.layerView = 'subsoil'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_GROUND) { Store.layerView = 'ground'; Store.viewMode = 'normal'; }
        if (k === C.LAYER_STRUCTURE) { Store.layerView = 'structure'; Store.viewMode = 'normal'; }

        if (k === C.TOOL_MINER) Store.buildMode = 'miner';
        if (k === C.TOOL_RACK) Store.buildMode = 'rack';
        if (k === C.TOOL_CABLE) Store.buildMode = 'cable';
        if (k === C.TOOL_PANEL) Store.buildMode = 'panel';
        if (k === C.TOOL_CLEANER) Store.buildMode = 'cleaner';
        if (k === C.TOOL_CARPET) Store.buildMode = 'carpet';
        if (k === C.TOOL_AC) Store.buildMode = 'ac_unit';
        if (k === C.TOOL_WALL_AC) Store.buildMode = 'wall_ac';

        if (k === C.CYCLE_HW) {
            e.preventDefault();
            Store.selectedHardwareIndex = (Store.selectedHardwareIndex + 1) % HARDWARE_DB.length;
        }

        if (k.toLowerCase() === C.ROTATE.toLowerCase()) {
            Store.buildRotation = (Store.buildRotation + 1) % 4;
            this.updateHoverValidity();
        }
    }

    handleMouseMove(e) {
        const rect = this.ctx.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { gx, gy } = screenToGrid(mx, my);

        if (Utils.isValid(gx, gy)) {
            Store.hover.x = gx;
            Store.hover.y = gy;
            this.updateHoverValidity();
        } else {
            Store.hover.x = -1;
            Store.hover.y = -1;
            Store.hover.valid = false;
        }
    }

    updateHoverValidity() {
        const status = this.getBuildStatus(Store.hover.x, Store.hover.y);
        Store.hover.valid = status.canBuild;
    }

    handleMouse(e) {
        if (Store.hover.x === -1) {
            // Clic en el vacío: Deseleccionar
            if (e.button === 0) Store.selectedEntityId = null;
            return;
        }

        if (e.button === 2) {
            this.handleDelete(Store.hover.x, Store.hover.y);
            return;
        }

        // Lógica de Selección (Inspector)
        // Si NO estamos en modo construcción activo (o es 'none'/'normal' implícitamente si buildMode fuera null, pero aquí es string)
        // En este juego, buildMode siempre tiene un valor por defecto ('miner'), así que comprobaremos si estamos sobre una entidad existente.
        const entitiesAtCursor = this.ecs.getEntitiesWith('position').filter(id => {
            const p = this.ecs.components.position.get(id);
            return p.x === Store.hover.x && p.y === Store.hover.y;
        });

        // Prioridad de selección: Minero > Rack > Otros
        if (e.button === 0 && entitiesAtCursor.length > 0) {
            // Si hacemos clic en algo existente, lo seleccionamos en lugar de construir
            // OJO: Esto podría conflictuar con construir encima.
            // Regla: Si no podemos construir aquí (ocupado), entonces seleccionamos.
            const status = this.getBuildStatus(Store.hover.x, Store.hover.y);

            if (!status.canBuild) {
                // Buscar la entidad más relevante
                const miner = entitiesAtCursor.find(id => this.ecs.components.miner?.has(id));
                const rack = entitiesAtCursor.find(id => this.ecs.components.rack?.has(id));
                const other = entitiesAtCursor[0];

                Store.selectedEntityId = miner || rack || other;
                return;
            }
        }

        // Si no seleccionamos nada, intentamos construir
        const status = this.getBuildStatus(Store.hover.x, Store.hover.y);
        
        if (status.canBuild) {
            this.executeBuild(Store.hover.x, Store.hover.y, status);
        } else {
            // Si no se pudo construir y tampoco seleccionamos (por ejemplo clic en vacio valido pero sin dinero), deseleccionar
            Store.selectedEntityId = null;
        }
    }

    getBuildStatus(gx, gy) {
        const mode = Store.buildMode;
        
        const entities = this.ecs.getEntitiesWith('position').filter(id => {
            const p = this.ecs.components.position.get(id);
            return p.x === gx && p.y === gy;
        });

        const hasSubsoil = entities.some(id => this.ecs.components.cable?.has(id));
        const hasGround = entities.some(id => this.ecs.components.carpet?.has(id));
        const hasRack = entities.some(id => this.ecs.components.rack?.has(id));
        const minersCount = entities.filter(id => this.ecs.components.miner?.has(id)).length;
        const hasObstacle = entities.some(id => 
            this.ecs.components.panel?.has(id) || this.ecs.components.cleaner?.has(id) ||
            this.ecs.components.ac_unit?.has(id) || this.ecs.components.wall_ac?.has(id)
        );

        if (mode === 'cable') {
            return { canBuild: !hasSubsoil };
        }
        if (mode === 'ac_unit') {
             // Suelo, no conflictos con rack/panel
             if (hasRack || hasObstacle || minersCount > 0) return { canBuild: false };
             return { canBuild: true };
        }
        if (mode === 'wall_ac') {
             // Pared
             if (hasRack || hasObstacle || minersCount > 0) return { canBuild: false };
             return { canBuild: true };
        }
        if (mode === 'rack') {
            if (minersCount > 0 || hasRack || hasObstacle) return { canBuild: false };
            return { canBuild: true };
        }
        if (mode === 'miner') {
            if (hasObstacle) return { canBuild: false };
            
            const stats = HARDWARE_DB[Store.selectedHardwareIndex];
            if (Store.economy.usd < stats.price) return { canBuild: false };

            let slot = 0;
            if (hasRack) {
                if (minersCount >= 6) return { canBuild: false };
                slot = minersCount;
            } else {
                if (minersCount >= 1) return { canBuild: false };
                slot = 0;
            }
            return { canBuild: true, slot: slot, price: stats.price };
        }
        if (mode === 'carpet') return { canBuild: !hasGround };
        if (mode === 'cleaner' || mode === 'panel') {
            if (minersCount > 0 || hasRack || hasObstacle) return { canBuild: false };
            return { canBuild: true };
        }

        return { canBuild: false };
    }

    executeBuild(gx, gy, status) {
        const mode = Store.buildMode;
        const id = this.ecs.createEntity();
        this.ecs.addComponent(id, 'position', { x: gx, y: gy });

        if (mode === 'cable') this.ecs.addComponent(id, 'cable', {});
        
        else if (mode === 'rack') this.ecs.addComponent(id, 'rack', { slots: 6 });
        
        else if (mode === 'miner') {
            const stats = HARDWARE_DB[Store.selectedHardwareIndex];
            Store.economy.usd -= status.price;
            this.ecs.addComponent(id, 'miner', {
                watts: stats.watts,
                heatOutput: stats.heat,
                hashrate: stats.hashrate,
                on: false,
                modelColor: stats.color,
                rotation: Store.buildRotation,
                slotIndex: status.slot
            });
        }
        
        else if (mode === 'carpet') this.ecs.addComponent(id, 'carpet', { noiseReduction: 0.6 });
        else if (mode === 'cleaner') this.ecs.addComponent(id, 'cleaner', { power: 0.05 });
        else if (mode === 'panel') this.ecs.addComponent(id, 'panel', { absorption: 0.85 });
        else if (mode === 'ac_unit') this.ecs.addComponent(id, 'ac_unit', { cooling: 50 });
        else if (mode === 'wall_ac') {
            this.ecs.addComponent(id, 'wall_ac', { cooling: 80 });
            this.ecs.addComponent(id, 'panel', {}); // También actúa como obstáculo (pared)
        }
    }

    handleDelete(gx, gy) {
        // Al hacer clic derecho, también cancelamos el modo construcción
        Store.buildMode = null;
        Store.hover.valid = false;

        const entities = this.ecs.getEntitiesWith('position').filter(id => {
            const p = this.ecs.components.position.get(id);
            return p.x === gx && p.y === gy;
        });

        const miners = entities.filter(id => this.ecs.components.miner?.has(id));
        if (miners.length > 0) {
            miners.sort((a, b) => (this.ecs.components.miner.get(b).slotIndex || 0) - (this.ecs.components.miner.get(a).slotIndex || 0));
            this.ecs.removeEntity(miners[0]);
            return;
        }
        const toDelete = entities.find(id => !this.ecs.components.socket?.has(id));
        if (toDelete) this.ecs.removeEntity(toDelete);
    }
}