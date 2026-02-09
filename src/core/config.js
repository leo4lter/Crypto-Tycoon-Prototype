export const CONFIG = {
    // Dimensiones del Mundo
    GRID_SIZE: 12,
    
    // Renderizado Isométrico
    TILE_W: 64,
    TILE_H: 32,
    ORIGIN_X: 400,
    ORIGIN_Y: 200,

    // Física Térmica
    HEAT: {
        MAX_TEMP: 85,          // Temperatura crítica
        AMBIENT: 20,           // Temperatura base
        DIFFUSION: 0.15,       // Velocidad de expansión (reducida)
        DISSIPATION: 0.002,    // Velocidad de enfriamiento (aceite)
        GENERATION_SCALE: 0.5, // Multiplicador de calor de los equipos
        INSULATION_FACTOR: 0.4,// Aislamiento de alfombras (retiene calor)
        EXPLOSION_HEAT: 300    // Calor generado al quemarse algo
    },
    RISK: {
        BASE_FAIL_CHANCE: 0.005, // Probabilidad base de fallo al sobrecalentarse
        FIRE_CHANCE: 0.4         // Probabilidad de incendio de alfombra
    },
    CONTROLS: {
        // Vistas (Mapas) - Usamos Function Keys para evitar conflictos
        VIEW_NORMAL: 'F1',
        VIEW_THERMAL: 'F2',
        VIEW_ELECTRIC: 'F3',
        VIEW_NOISE: 'F4',
        VIEW_DIRT: 'F5',

        // Capas (Layers)
        LAYER_NORMAL: '1',
        LAYER_SUBSOIL: '2',
        LAYER_GROUND: '3',
        LAYER_STRUCTURE: '4',

        // Acciones
        ROTATE: 'r',      // Ahora R es EXCLUSIVO para rotar
        CYCLE_HW: 'Tab',
        DELETE: 'Delete', // O Click Derecho

        // Herramientas de Construcción
        TOOL_MINER: 'm',
        TOOL_RACK: 'k',
        TOOL_CABLE: 'b',
        TOOL_PANEL: 'p',
        TOOL_CLEANER: 'l',
        TOOL_CARPET: 'c',
        TOOL_AC: 'a',      // AC de Suelo
        TOOL_WALL_AC: 'w'  // AC de Pared
    }
};