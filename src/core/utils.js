import { CONFIG } from './config.js';

export const Utils = {
    // Verifica si una coordenada está dentro del mapa
    isValid(x, y) {
        return x >= 0 && x < CONFIG.GRID_SIZE && y >= 0 && y < CONFIG.GRID_SIZE;
    },

    // Convierte coordenadas X,Y a un índice único para Arrays (Heatmap)
    index(x, y) {
        return x + y * CONFIG.GRID_SIZE;
    },

    // Convierte coordenadas X,Y a un string único para Sets (Cables)
    key(x, y) {
        return `${x},${y}`;
    },

    // Obtiene los vecinos válidos (Norte, Sur, Este, Oeste)
    // Esto reemplaza todos esos bucles feos de "neighbors = [...]"
    getNeighbors(x, y) {
        const results = [];
        const dirs = [
            { x: 0, y: -1 }, // Norte
            { x: 0, y: 1 },  // Sur
            { x: -1, y: 0 }, // Oeste
            { x: 1, y: 0 }   // Este
        ];

        for (const dir of dirs) {
            const nx = x + dir.x;
            const ny = y + dir.y;
            if (this.isValid(nx, ny)) {
                results.push({ x: nx, y: ny });
            }
        }
        return results;
    }
};