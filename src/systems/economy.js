import { Store } from '../core/store.js';

export class EconomySystem {
    constructor(ecs) {
        this.ecs = ecs;
        this.timer = 0;
    }

    update(dt) {
        // Actualizamos la economía cada 1 segundo (1000ms) para no saturar
        // y para que los números sean legibles.
        this.timer += dt;
        if (this.timer < 1000) return; 
        this.timer = 0;

        // 1. Calcular Hashrate Total
        let totalHashrate = 0;
        const miners = this.ecs.getEntitiesWith('miner');
        
        for (const id of miners) {
            const miner = this.ecs.components.miner.get(id);
            // Solo minan si tienen electricidad (ON)
            if (miner.on) {
                // Por defecto asumimos que 1 Watt = 1 Hash (simplificado por ahora)
                // En el futuro esto dependerá del modelo del minero
                totalHashrate += miner.watts; 
            }
        }

        Store.economy.globalHashrate = totalHashrate;

        // 2. Minar (Reward Formula simplificada)
        if (totalHashrate > 0) {
            // Fórmula: (Hashrate / Dificultad) * Factor arbitrario
            const reward = (totalHashrate / Store.economy.difficulty) * 0.0001;
            Store.economy.btc += reward;
        }

        // 3. Fluctuación de Mercado (Simulación simple)
        // El precio varía un +/- 1% cada segundo
        const fluctuation = 1 + (Math.random() * 0.02 - 0.01);
        Store.economy.btcPrice *= fluctuation;
    }
}