import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';

export class SimulationSystem {
    constructor(ecs) {
        this.ecs = ecs;
    }

    update() {
        this.updateElectricity();
        this.updateHeat();
        this.updateDisasters(); // <--- NUEVA FASE DE PELIGRO
        this.updateNoise();
        this.updateDirt();
        this.updateCleaning();
    }

    updateElectricity() {
        Store.electricity.usedWatts = 0;

        const sockets = this.ecs.getEntitiesWith('position', 'socket');
        const cables = this.ecs.getEntitiesWith('position', 'cable');
        const miners = this.ecs.getEntitiesWith('position', 'miner');

        // 1. Mapa de cables
        const cableMap = new Set();
        for (const c of cables) {
            const pos = this.ecs.components.position.get(c);
            cableMap.add(`${pos.x},${pos.y}`);
        }

        // 2. Propagación de energía (BFS)
        const poweredTiles = new Set();
        const queue = [];

        for (const s of sockets) {
            const pos = this.ecs.components.position.get(s);
            const key = `${pos.x},${pos.y}`;
            poweredTiles.add(key);
            queue.push(pos);
        }

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ];

            for (const n of neighbors) {
                const key = `${n.x},${n.y}`;
                if (cableMap.has(key) && !poweredTiles.has(key)) {
                    poweredTiles.add(key);
                    queue.push(n);
                }
            }
        }

        // 3. Estado de Mineros
        for (const m of miners) {
            const pos = this.ecs.components.position.get(m);
            const miner = this.ecs.components.miner.get(m);
            const key = `${pos.x},${pos.y}`;
            
            // Si está roto, no enciende, aunque tenga energía.
            if (miner.broken) {
                miner.on = false;
                continue;
            }

            const isPowered = poweredTiles.has(key);
            
            // IMPORTANTE: Quitamos la protección "heat < 85". 
            // Ahora el jugador es responsable de apagarlo o enfriarlo.
            miner.on = isPowered; 

            if (miner.on) {
                Store.electricity.usedWatts += miner.watts;
            }
        }
    }

    // === LÓGICA DE DESASTRES Y QUEMADURAS ===
    updateDisasters() {
        const GRID = Store.GRID;
        const miners = this.ecs.getEntitiesWith('position', 'miner');

        for (const m of miners) {
            const miner = this.ecs.components.miner.get(m);
            if (!miner.on || miner.broken) continue; // Si está apagado o ya roto, ignorar

            const pos = this.ecs.components.position.get(m);
            const idx = pos.x + pos.y * GRID;
            const temp = Store.heat[idx];

            // UMBRAL DE PELIGRO: 85 Grados
            if (temp > 85) {
                // Probabilidad de fallo por frame. 
                // A 60 FPS, 0.5% significa que probablemente se rompa en ~3 segundos de sobrecalentamiento.
                // Cuanto más calor, mayor probabilidad.
                const riskFactor = 0.005 + ((temp - 85) * 0.001); 

                if (Math.random() < riskFactor) {
                    this.triggerDisaster(m, pos);
                }
            }
        }
    }

    triggerDisaster(entityId, pos) {
        const miner = this.ecs.components.miner.get(entityId);
        
        console.log(`¡DESASTRE en ${pos.x},${pos.y}!`);
        
        // 1. Marcar como roto (Game Over para este minero)
        miner.broken = true;
        miner.on = false; // Se apaga por el daño

        // 2. Verificar Incendio de Alfombra
        // Si hay alfombra abajo, hay 40% de chance de que se prenda fuego
        const carpetEntity = this.getCarpetEntityAt(pos.x, pos.y);
        
        if (carpetEntity && Math.random() < 0.4) {
            console.log("¡INCENDIO DE ALFOMBRA!");
            // Eliminar la alfombra (se quemó)
            this.ecs.removeEntity(carpetEntity);
            
            // Generar pico de calor extremo (explosión térmica)
            const idx = pos.x + pos.y * Store.GRID;
            Store.heat[idx] += 300; // Esto se expandirá a los vecinos por updateHeat
        }
    }

    updateHeat() {
        const GRID = Store.GRID;
        const AMBIENT_TEMP = 20; 
        const DIFFUSION_RATE = CONFIG.HEAT.DIFFUSION;
        const DISSIPATION_RATE = CONFIG.HEAT.DISSIPATION;
        const HEAT_GENERATION_SCALE = CONFIG.HEAT.GENERATION_SCALE;
        const INSULATION_FACTOR = CONFIG.HEAT.INSULATION_FACTOR || 0.4;

        // 0. Copiar buffer anterior (paso de simulación)
        // Usamos set() para copiar rápido los valores
        Store.heatBuffer.set(Store.heat);

        // 1. Inyectar calor (Miners) con lógica DIRECCIONAL
        const miners = this.ecs.getEntitiesWith('position', 'miner');
        for (const m of miners) {
            const pos = this.ecs.components.position.get(m);
            const miner = this.ecs.components.miner.get(m);
            
            // Reset suffocation flag
            miner.suffocating = false;

            if (miner.on) {
                const idx = pos.x + pos.y * GRID;
                const heatAmount = (miner.heatOutput || 1.0) * HEAT_GENERATION_SCALE;

                // Nueva Lógica de Dirección basada en la Flecha Roja (Salida)
                // Rot 0 (Norte Visual): {x, y-1}
                // Rot 1 (Este Visual):  {x+1, y}
                // Rot 2 (Sur Visual):   {x, y+1}
                // Rot 3 (Oeste Visual): {x-1, y}

                let targetX = pos.x;
                let targetY = pos.y;
                const rot = pos.rotation || 0;

                if (rot === 0) targetY -= 1;      // Norte
                else if (rot === 1) targetX += 1; // Este
                else if (rot === 2) targetY += 1; // Sur
                else if (rot === 3) targetX -= 1; // Oeste

                // Verificar si la celda objetivo es válida
                const isTargetValid = (targetX >= 0 && targetX < GRID && targetY >= 0 && targetY < GRID);
                let isBlocked = false;

                if (isTargetValid) {
                    // Chequear obstáculos en la salida (Pared, Panel, Rack, Otro Minero)
                    isBlocked = this.getObstacleAt(targetX, targetY);
                } else {
                    isBlocked = true; // Borde del mapa cuenta como bloqueo
                }

                if (isBlocked) {
                    // "Thermal Backflow": El calor rebota y se acumula en el origen multiplicándose
                    Store.heatBuffer[idx] += heatAmount * 1.5;
                    miner.suffocating = true;
                } else {
                    // Flujo normal: 80% a la salida, 20% en origen (radiación chasis)
                    const targetIdx = targetX + targetY * GRID;
                    Store.heatBuffer[targetIdx] += heatAmount * 0.8;
                    Store.heatBuffer[idx] += heatAmount * 0.2;
                    miner.suffocating = false;
                }
            }
        }

        // 2. Refrigeración Activa (AC)
        const acUnits = this.ecs.getEntitiesWith('position', 'ac_unit');
        for (const ac of acUnits) {
            const pos = this.ecs.components.position.get(ac);
            const cooling = this.ecs.components.ac_unit.get(ac).cooling || 50;
            const idx = pos.x + pos.y * GRID;

            // Enfría la propia celda
            Store.heatBuffer[idx] = Math.max(AMBIENT_TEMP, Store.heatBuffer[idx] - cooling);

            // Enfría las 4 vecinas (AC de suelo es omnidireccional simple por ahora)
             const neighbors = [
                { nx: pos.x + 1, ny: pos.y }, { nx: pos.x - 1, ny: pos.y },
                { nx: pos.x, ny: pos.y + 1 }, { nx: pos.x, ny: pos.y - 1 }
            ];
            for (const n of neighbors) {
                if (n.nx >= 0 && n.nx < GRID && n.ny >= 0 && n.ny < GRID) {
                    const nIdx = n.nx + n.ny * GRID;
                    Store.heatBuffer[nIdx] = Math.max(AMBIENT_TEMP, Store.heatBuffer[nIdx] - (cooling * 0.5));
                }
            }
        }

        const wallACs = this.ecs.getEntitiesWith('position', 'wall_ac');
        for (const ac of wallACs) {
            const pos = this.ecs.components.position.get(ac);
            const cooling = this.ecs.components.wall_ac.get(ac).cooling || 80;
            const idx = pos.x + pos.y * GRID;
             // AC de Pared enfría agresivamente su celda
            Store.heatBuffer[idx] = Math.max(AMBIENT_TEMP, Store.heatBuffer[idx] - cooling);
        }

        // 3. Difusión y Disipación
        // Copiamos buffer a temporal para cálculo de difusión síncrono
        const prevHeat = new Float32Array(Store.heatBuffer);

        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const idx = x + y * GRID;
                const currentTemp = prevHeat[idx];

                let neighborTempSum = 0;
                let neighborCount = 0;

                const neighbors = [
                    { nx: x, ny: y - 1 }, { nx: x, ny: y + 1 },
                    { nx: x - 1, ny: y }, { nx: x + 1, ny: y }
                ];

                for (const n of neighbors) {
                    if (n.nx >= 0 && n.nx < GRID && n.ny >= 0 && n.ny < GRID) {
                        neighborTempSum += prevHeat[n.nx + n.ny * GRID];
                        neighborCount++;
                    }
                }

                const avgNeighborTemp = neighborCount > 0 ? neighborTempSum / neighborCount : currentTemp;

                // Difusión
                let newTemp = currentTemp + (avgNeighborTemp - currentTemp) * DIFFUSION_RATE;

                // Disipación (Enfriamiento pasivo)
                // Aislamiento: Si hay alfombra, disipa MENOS calor (retiene más)
                let dissipation = DISSIPATION_RATE;
                if (this.getCarpetAt(x, y)) {
                    dissipation *= (1.0 - INSULATION_FACTOR); // Reducir disipación
                }

                newTemp = newTemp + (AMBIENT_TEMP - newTemp) * dissipation;

                Store.heatBuffer[idx] = newTemp;
            }
        }

        // Aplicar buffer al estado real
        Store.heat.set(Store.heatBuffer);
    }

    updateNoise() {
        Store.noise.fill(0);
        const miners = this.ecs.getEntitiesWith('position', 'miner');
        for (const m of miners) {
            const pos = this.ecs.components.position.get(m);
            const miner = this.ecs.components.miner.get(m);
            if (!miner.on) continue;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = pos.x + dx; const y = pos.y + dy;
                    if (x < 0 || y < 0 || x >= Store.GRID || y >= Store.GRID) continue;
                    let amount = 0;
                    const dist = Math.abs(dx) + Math.abs(dy);
                    if (dist === 0) amount = 40; else if (dist === 1) amount = 25; else amount = 15;

                    // Alfombras reducen la generación/propagación de ruido en su celda
                    if (this.getCarpetAt(x, y)) amount *= 0.6; // Reducción del 40%

                    if (this.getPanelAt(x, y)) amount *= 0.15;
                    Store.noise[x + y * Store.GRID] += amount;
                }
            }
        }
    }

    updateDirt() {
        for (let i = 0; i < Store.dirt.length; i++) Store.dirt[i] += Store.noise[i] * 0.0005;
        const miners = this.ecs.getEntitiesWith('position', 'miner');
        for (const m of miners) {
            const pos = this.ecs.components.position.get(m);
            const miner = this.ecs.components.miner.get(m);
            if (!miner.on) continue;
            const idx = pos.x + pos.y * Store.GRID;
            Store.dirt[idx] += 0.02;
            if (this.getCarpetAt(pos.x, pos.y)) Store.dirt[idx] += 0.02;
        }
    }

    updateCleaning() {
        const cleaners = this.ecs.getEntitiesWith('position', 'cleaner');
        for (const c of cleaners) {
            const pos = this.ecs.components.position.get(c);
            const power = this.ecs.components.cleaner.get(c).power;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = pos.x + dx; const y = pos.y + dy;
                    if (x < 0 || y < 0 || x >= Store.GRID || y >= Store.GRID) continue;
                    const idx = x + y * Store.GRID;
                    Store.dirt[idx] = Math.max(0, Store.dirt[idx] - power);
                }
            }
        }
    }

    // Helpers
    getCarpetAt(x, y) {
        return this.ecs.getEntitiesWith('position', 'carpet').some(id => {
            const p = this.ecs.components.position.get(id); return p.x === x && p.y === y;
        });
    }
    
    // Nuevo helper para obtener la entidad real y poder borrarla
    getCarpetEntityAt(x, y) {
        const carpets = this.ecs.getEntitiesWith('position', 'carpet');
        for (const c of carpets) {
            const p = this.ecs.components.position.get(c);
            if (p.x === x && p.y === y) return c;
        }
        return null;
    }

    getPanelAt(x, y) {
        return this.ecs.getEntitiesWith('position', 'panel').some(id => {
            const p = this.ecs.components.position.get(id); return p.x === x && p.y === y;
        });
    }

    getObstacleAt(x, y) {
        // Devuelve true si hay algo que bloquee flujo de aire (Pared, Panel, Minero, Rack, WallAC)
        return this.ecs.getEntitiesWith('position').some(id => {
            const p = this.ecs.components.position.get(id);
            if (p.x !== x || p.y !== y) return false;

            // Componentes que bloquean
            return (
                this.ecs.components.panel?.has(id) ||
                this.ecs.components.rack?.has(id) ||
                this.ecs.components.miner?.has(id) ||
                this.ecs.components.wall_ac?.has(id)
            );
        });
    }
}
