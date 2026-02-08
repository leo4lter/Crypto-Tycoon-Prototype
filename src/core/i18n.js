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