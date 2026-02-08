import { CONFIG } from './config.js';

export const Store = {
    GRID: CONFIG.GRID_SIZE,
    hover: {
        x: -1,
        y: -1,
        valid: false
    },

    electricity: {
        maxWatts: 2000,
        usedWatts: 0,
    },

    economy: {
        usd: 5000,
        btc: 0.00000000,
        globalHashrate: 0,
        btcPrice: 50000,
        difficulty: 1000
    },
    selectedHardwareIndex: 0,
    buildRotation: 0, 
    isPaused: false,
    hover: { x: -1, y: -1, valid: false },
    heat: new Float32Array(CONFIG.GRID_SIZE * CONFIG.GRID_SIZE),
    heatBuffer: new Float32Array(CONFIG.GRID_SIZE * CONFIG.GRID_SIZE),
    noise: new Float32Array(CONFIG.GRID_SIZE * CONFIG.GRID_SIZE),
    dirt: new Float32Array(CONFIG.GRID_SIZE * CONFIG.GRID_SIZE),

    viewMode: 'normal',
    layerView: 'normal',
    buildMode: 'miner'
};