// src/core/i18n.js
const CURRENT_LANG = 'es';

const dictionary = {
    es: {
        'ui.mode.layer.normal': 'VISTA NORMAL',
        'ui.mode.layer.subsoil': 'VISTA SUBSUELO (Cables)',
        'ui.mode.layer.ground': 'VISTA SUELO (Alfombras)',
        'ui.mode.layer.structure': 'VISTA ESTRUCTURA',
        'debug.fps': 'FPS',
        // Construcción
        'build.miner': 'Construir: MINERO',
        'build.rack': 'Construir: RACK',
        'build.cable': 'Construir: CABLE',
        'build.carpet': 'Construir: ALFOMBRA',
        'build.cleaner': 'Construir: LIMPIADOR',
        'build.panel': 'Construir: PANEL',
        'build.ac_unit': 'Construir: AC SUELO',
        'build.wall_ac': 'Construir: AC PARED',
        // Bindings
        'key.view_normal': 'VISTA NORMAL',
        'key.view_thermal': 'VISTA TÉRMICA',
        'key.view_electric': 'VISTA ELÉCTRICA',
        'key.view_noise': 'VISTA RUIDO',
        'key.view_dirt': 'VISTA SUCIEDAD',
        'key.layer_normal': 'CAPA NORMAL',
        'key.layer_subsoil': 'CAPA SUBSUELO',
        'key.layer_ground': 'CAPA SUELO',
        'key.layer_structure': 'CAPA ESTRUCTURA',
        'key.tool_miner': 'HERR: MINERO',
        'key.tool_rack': 'HERR: RACK',
        'key.tool_cable': 'HERR: CABLE',
        'key.tool_panel': 'HERR: PANEL',
        'key.tool_cleaner': 'HERR: LIMPIADOR',
        'key.tool_carpet': 'HERR: ALFOMBRA',
        'key.tool_ac': 'HERR: AC SUELO',
        'key.tool_wall_ac': 'HERR: AC PARED',
        'key.cycle_hw': 'CICLAR HARDWARE',
        'key.rotate': 'ROTAR',
        // Inspector
        'inspector.miner': 'MINERO',
        'inspector.rack': 'RACK DE SERVIDORES',
        'inspector.cable': 'CABLE DE ALTA TENSIÓN',
        'inspector.unknown': 'OBJETO DESCONOCIDO',
        'inspector.status': 'Estado',
        'inspector.on': 'ENCENDIDO',
        'inspector.off': 'APAGADO/SIN ENERGÍA',
        'inspector.hashrate': 'Hashrate',
        'inspector.consumption': 'Consumo',
        'inspector.temp': 'Temp Local',
        'inspector.slots': 'Slots Totales',
        'inspector.stable': 'ESTABLE',
        'inspector.ac_unit': 'AC DE SUELO',
        'inspector.wall_ac': 'AC DE PARED',
        'inspector.close': 'CERRAR',
        'inspector.suffocation': '¡AHOGO TÉRMICO!',
        'inspector.blocked_air': '(Salida de aire bloqueada)',
        'inspector.isolated': '(Aislado)',
        'inspector.broken': '¡ROTO! REPARAR... (WIP)'
    },
    en: {
        'ui.mode.layer.normal': 'NORMAL VIEW',
        'ui.mode.layer.subsoil': 'SUBSOIL VIEW (Cables)',
        'ui.mode.layer.ground': 'GROUND VIEW (Carpets)',
        'ui.mode.layer.structure': 'STRUCTURE VIEW',
        'debug.fps': 'FPS',
        // Construcción
        'build.miner': 'Build: MINER',
        'build.rack': 'Build: RACK',
        'build.cable': 'Build: CABLE',
        'build.carpet': 'Build: CARPET',
        'build.cleaner': 'Build: CLEANER',
        'build.panel': 'Build: PANEL',
    }
};

export function t(key) {
    return dictionary[CURRENT_LANG][key] || key;
}