// src/core/hardware.js

export const HARDWARE_DB = [
    {
        id: 'cpu_2009',
        name: 'Intel Core 2 Quad',
        type: 'CPU',
        price: 150,
        hashrate: 0.5,   // Muy bajo
        watts: 105,      // Consumo medio
        heat: 1.5,       // Calienta un poco más
        color: '#3b82f6',// Azul
        ventDirection: 'back',
        size: [1, 1]
    },
    {
        id: 'gpu_2011',
        name: 'ATI Radeon HD 5870',
        type: 'GPU',
        price: 350,
        hashrate: 12.0,  // Medio
        watts: 188,      // Consumo alto para la época
        heat: 5.0,       // Calienta bastante
        color: '#ef4444',// Rojo
        ventDirection: 'back',
        size: [1, 1]
    },
    {
        id: 'asic_2013',
        name: 'Antminer S1 (Large)',
        type: 'ASIC',
        price: 2000,
        hashrate: 180.0, // Bestial
        watts: 360,      // Eficiente por watt, pero consumo total alto
        heat: 20.0,      // Un horno industrial
        color: '#10b981',// Verde
        ventDirection: 'back',
        size: [2, 1]     // Prueba Multi-Tile (2 ancho x 1 alto)
    },
    {
        id: 'ac_wall_unit',
        name: 'AC Split (Wall)',
        type: 'cooling',
        price: 800,
        watts: 800,
        heat: -15, // Enfría
        placement: 'wall_adjacent',
        color: '#93c5fd',
        size: [1, 1]
    }
];