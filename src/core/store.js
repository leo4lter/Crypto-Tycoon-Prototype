export const Store = {
    GRID: 12,

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

    // Selección
    selectedHardwareIndex: 0,
    buildRotation: 0, // 0: SE, 1: SW, 2: NW, 3: NE (Sentido horario)

    heat: new Float32Array(12 * 12),
    heatBuffer: new Float32Array(12 * 12),
    noise: new Float32Array(12 * 12),
    dirt: new Float32Array(12 * 12),

    viewMode: 'normal',
    layerView: 'normal',
    buildMode: 'miner'
};