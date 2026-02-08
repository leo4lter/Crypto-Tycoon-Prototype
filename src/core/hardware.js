// src/core/hardware.js

export const HARDWARE_DB = [
    {
        id: 'cpu_2009',
        name: 'Intel Core 2 Quad',
        type: 'CPU',
        price: 150,
        hashrate: 0.5,   // Muy bajo
        watts: 105,      // Consumo medio
        heat: 0.8,       // Calienta poco
        color: '#3b82f6' // Azul
    },
    {
        id: 'gpu_2011',
        name: 'ATI Radeon HD 5870',
        type: 'GPU',
        price: 350,
        hashrate: 12.0,  // Medio
        watts: 188,      // Consumo alto para la época
        heat: 2.5,       // Calienta bastante
        color: '#ef4444' // Rojo
    },
    {
        id: 'asic_2013',
        name: 'Antminer S1',
        type: 'ASIC',
        price: 2000,
        hashrate: 180.0, // Bestial
        watts: 360,      // Eficiente por watt, pero consumo total alto
        heat: 6.0,       // Un horno industrial
        color: '#10b981' // Verde
    }
];