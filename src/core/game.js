import { Store } from './store.js';
import { ECS } from './ecs.js';
import { globalEventBus } from './eventBus.js';
import { Assets } from './loader.js';
import { SimulationSystem } from '../systems/simulation.js';
import { EconomySystem } from '../systems/economy.js'; 
import { UISystem } from '../systems/ui.js';
import { InputSystem } from '../systems/input.js';
import { HierarchySystem } from '../systems/hierarchy.js';
import {
    drawGrid, drawMiner, drawSocket, drawCable, drawHeatMap, 
    drawNoiseMap, drawDirtMap, drawCarpet, drawCleaner, 
    drawPanel, drawConnectedCable, screenToGrid, drawRack,
    drawSubsoilCable, drawGhost, drawACUnit, drawWallAC
} from '../renderer/isometric.js';

export class Game {
    constructor(ctx) {
        this.ctx = ctx;
        this.ecs = new ECS();
        this.eventBus = globalEventBus;
        
        this.inputSystem = new InputSystem(this);
        this.simulationSystem = new SimulationSystem(this.ecs);
        this.economySystem = new EconomySystem(this.ecs);
        this.hierarchySystem = new HierarchySystem(this.ecs);
        this.uiSystem = new UISystem(this);

        Store.layerView = 'normal'; 
        Store.viewMode = 'normal';
        Store.buildMode = 'miner';

        const socket = this.ecs.createEntity();
        this.ecs.addComponent(socket, 'position', { x: 4, y: 4 });
        this.ecs.addComponent(socket, 'socket', {});

        Assets.loadAll(); // Iniciar carga de assets

        this.lastTime = performance.now();
        this.acc = 0;
        this.TIME_STEP = 1000 / 60;
    }

    update(time) {
        const dt = time - this.lastTime;
        this.lastTime = time;
        this.acc += dt;
        if (this.acc > 250) this.acc = 250;

        while (this.acc >= this.TIME_STEP) {
            this.hierarchySystem.update();
            this.simulationSystem.update(); 
            this.economySystem.update(this.TIME_STEP);
            this.acc -= this.TIME_STEP;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.uiSystem.update(this.TIME_STEP);

        const isAnalysisMode = (
            Store.viewMode === 'temperature' || 
            Store.viewMode === 'noise' || 
            Store.viewMode === 'dirt'
        );
        const isElecMode = (Store.viewMode === 'electricity');
        
        if (Store.viewMode === 'temperature') drawHeatMap(this.ctx);
        else if (Store.viewMode === 'noise') drawNoiseMap(this.ctx);
        else if (Store.viewMode === 'dirt') drawDirtMap(this.ctx);
        else drawGrid(this.ctx, isElecMode); 

        const cablesSet = new Set();
        const socketsSet = new Set();
        const racksSet = new Set();
        for (const id of this.ecs.getEntitiesWith('position', 'cable')) {
            const p = this.ecs.components.position.get(id); cablesSet.add(`${p.x},${p.y}`);
        }
        for (const id of this.ecs.getEntitiesWith('position', 'socket')) {
            const p = this.ecs.components.position.get(id); socketsSet.add(`${p.x},${p.y}`);
        }
        for (const id of this.ecs.getEntitiesWith('position', 'rack')) {
            const p = this.ecs.components.position.get(id); racksSet.add(`${p.x},${p.y}`);
        }

        const renderList = [];
        const useGrayscale = isAnalysisMode || isElecMode;

        if (Store.layerView !== 'subsoil') {
            for (const id of this.ecs.getEntitiesWith('position', 'carpet')) {
                const pos = this.ecs.components.position.get(id);
                renderList.push({
                    depth: (pos.x + pos.y) * 10,
                    draw: () => drawCarpet(this.ctx, pos, useGrayscale)
                });
            }
        }

        const showCables = (Store.layerView === 'subsoil' || isElecMode);
        if (showCables) {
             for (const id of this.ecs.getEntitiesWith('position', 'cable')) {
                const pos = this.ecs.components.position.get(id);
                renderList.push({
                    depth: (pos.x + pos.y) * 10 + 0.5,
                    draw: () => drawConnectedCable(this.ctx, pos, cablesSet, socketsSet)
                });
            }
        }
        for (const id of this.ecs.getEntitiesWith('position', 'socket')) {
             const pos = this.ecs.components.position.get(id);
             renderList.push({
                 depth: (pos.x + pos.y) * 10 + 1,
                 draw: () => drawSocket(this.ctx, pos, useGrayscale)
             });
        }

        if (Store.layerView !== 'subsoil') {
            const entities = [
                ...this.ecs.getEntitiesWith('position', 'miner').map(id => ({ id, type: 'miner' })),
                ...this.ecs.getEntitiesWith('position', 'panel').map(id => ({ id, type: 'panel' })),
                ...this.ecs.getEntitiesWith('position', 'cleaner').map(id => ({ id, type: 'cleaner' })),
                ...this.ecs.getEntitiesWith('position', 'rack').map(id => ({ id, type: 'rack' })),
                ...this.ecs.getEntitiesWith('position', 'ac_unit').map(id => ({ id, type: 'ac_unit' })),
                ...this.ecs.getEntitiesWith('position', 'wall_ac').map(id => ({ id, type: 'wall_ac' }))
            ];
            
            for (const item of entities) {
                const pos = this.ecs.components.position.get(item.id);
                let depth = (pos.x + pos.y) * 10 + 5; 

                renderList.push({
                    depth: depth,
                    draw: () => {
                        if (item.type === 'miner') {
                             const data = this.ecs.components.miner.get(item.id);
                             const isInRack = racksSet.has(`${pos.x},${pos.y}`);
                             drawMiner(this.ctx, { ...pos, ...data }, isInRack ? 1 : 0, useGrayscale);

                        } else if (item.type === 'panel') {
                            drawPanel(this.ctx, pos, useGrayscale);
                        } else if (item.type === 'cleaner') {
                            drawCleaner(this.ctx, pos, useGrayscale);
                        } else if (item.type === 'rack') {
                            drawRack(this.ctx, pos, useGrayscale);
                        } else if (item.type === 'ac_unit') {
                            drawACUnit(this.ctx, pos, useGrayscale);
                        } else if (item.type === 'wall_ac') {
                            drawWallAC(this.ctx, pos, useGrayscale);
                        }
                    }
                });
            }
        }

        if (Store.hover && Store.hover.x !== -1 && Store.buildMode) {
            const h = Store.hover;
            const depth = (h.x + h.y) * 10 + 9;

            renderList.push({
                depth: depth,
                draw: () => {
                    drawGhost(
                        this.ctx, 
                        Store.buildMode, 
                        h.x, 
                        h.y, 
                        h.valid, 
                        Store.buildRotation
                    );
                }
            });
        }

        renderList.sort((a, b) => a.depth - b.depth);
        for (const item of renderList) item.draw();
    }
}