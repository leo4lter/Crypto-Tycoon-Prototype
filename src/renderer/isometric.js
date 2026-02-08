import { Store } from '../core/store.js';

const TILE_W = 64;
const TILE_H = 32;
const ORIGIN_X = 400;
const ORIGIN_Y = 200;

export function gridToScreen(x, y) {
    return {
        x: (x - y) * (TILE_W / 2) + ORIGIN_X,
        y: (x + y) * (TILE_H / 2) + ORIGIN_Y,
    };
}

export function screenToGrid(x, y) {
    let dx = x - ORIGIN_X;
    let dy = y - ORIGIN_Y;
    const gx = Math.floor((dy / (TILE_H / 2) + dx / (TILE_W / 2)) / 2);
    const gy = Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
    return { gx, gy };
}

export function drawGrid(ctx, dim = false) {
    for (let y = 0; y < Store.GRID; y++) {
        for (let x = 0; x < Store.GRID; x++) {
            drawDiamond(ctx, x, y, dim ? '#111' : '#1e2a3a', dim ? '#222' : '#2a3a4a');
        }
    }
}

export function drawHeatMap(ctx) {
    drawValueMap(ctx, Store.heat, (v) => {
        if (v < 22) return '#0033ff';
        if (v < 28) return '#0088aa';
        if (v < 40) return '#00cc66';
        if (v < 60) return '#ffcc00';
        return '#ff3300';
    });
}
export function drawNoiseMap(ctx) { drawValueMap(ctx, Store.noise, v => v < 20 ? '#002244' : v < 40 ? '#0055aa' : v < 60 ? '#ffaa00' : '#ff3300'); }
export function drawDirtMap(ctx) { drawValueMap(ctx, Store.dirt, v => v < 1 ? '#223322' : v < 3 ? '#556622' : v < 6 ? '#997733' : '#553311'); }

function drawValueMap(ctx, map, colorFn) {
    for (let y = 0; y < Store.GRID; y++) {
        for (let x = 0; x < Store.GRID; x++) {
            const value = map[x + y * Store.GRID];
            drawDiamond(ctx, x, y, colorFn(value));
        }
    }
}

function drawDiamond(ctx, x, y, color, strokeColor) {
    const p = gridToScreen(x, y);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2);
    ctx.lineTo(p.x, p.y + TILE_H);
    ctx.lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
}

// === MINERO (Con soporte para altura por Slot) ===
export function drawMiner(ctx, pos, forcedElevation = 0, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    
    // Cálculo de altura:
    // Si forcedElevation es 1 (hay rack), elevamos la base un poco.
    // Sumamos 14px por cada slotIndex.
    const slot = pos.slotIndex || 0;
    const baseOffset = forcedElevation > 0 ? 10 : 0;
    const elevation = baseOffset + (slot * 14);

    const drawY = p.y - elevation;

    let bodyColor = pos.on ? '#00ff88' : '#555'; 
    if (!grayscale && pos.modelColor) bodyColor = pos.modelColor;
    
    if (grayscale) {
        bodyColor = '#444';
        if (pos.on) bodyColor = '#666';
    }

    // Cuerpo
    ctx.fillStyle = bodyColor;
    ctx.fillRect(p.x - 8, drawY + 6, 16, 12);
    
    // Led
    if (pos.on && !grayscale) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 2, drawY + 8, 4, 4);
    }

    // Flecha de Rotación
    if (!grayscale) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = p.x; 
        const cy = drawY + 6;
        const rot = pos.rotation || 0;
        
        if (rot === 0) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy + 3); } 
        else if (rot === 1) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 6, cy + 3); } 
        else if (rot === 2) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 6, cy - 3); } 
        else if (rot === 3) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy - 3); }
        ctx.stroke();
    }
}

export function drawRack(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    const baseY = p.y + 10; 
    
    const colorBase = grayscale ? '#222' : '#2d3748';
    const colorPilar = grayscale ? '#333' : '#4a5568';

    // Base
    ctx.fillStyle = colorBase;
    ctx.fillRect(p.x - 20, baseY - 5, 40, 5); 

    // Pilares (Altura suficiente para 6 mineros ~ 95px)
    ctx.fillStyle = colorPilar;
    ctx.fillRect(p.x - 20, baseY - 95, 4, 95); 
    ctx.fillRect(p.x + 16, baseY - 95, 4, 95); 

    // Estantes decorativos
    ctx.fillStyle = colorBase;
    ctx.fillRect(p.x - 20, baseY - 35, 40, 2); 
    ctx.fillRect(p.x - 20, baseY - 65, 40, 2); 
    
    // Tope
    ctx.fillRect(p.x - 20, baseY - 95, 40, 4); 
}

export function drawSocket(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = grayscale ? '#443300' : '#ffcc00'; 
    ctx.beginPath();
    ctx.arc(p.x, p.y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
}

export function drawCleaner(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = grayscale ? '#222' : '#00cccc';
    ctx.fillRect(p.x - 5, p.y + 12, 10, 10);
}

export function drawPanel(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = grayscale ? '#111' : '#444';
    ctx.fillRect(p.x - 2, p.y + 5, 4, 22);
}

export function drawCarpet(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = grayscale ? 'rgba(0, 0, 0, 0.2)' : 'rgba(150, 50, 200, 0.6)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 10);
    ctx.lineTo(p.x + 18, p.y + 20);
    ctx.lineTo(p.x, p.y + 30);
    ctx.lineTo(p.x - 18, p.y + 20);
    ctx.closePath();
    ctx.fill();
}

export function drawCable(ctx, a, b, grayscale = false) {
    const p1 = gridToScreen(a.x, a.y);
    const p2 = gridToScreen(b.x, b.y);
    ctx.strokeStyle = grayscale ? '#112233' : '#00ccff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 16);
    ctx.lineTo(p2.x, p2.y + 16);
    ctx.stroke();
    ctx.lineWidth = 1;
}

export function drawConnectedCable(ctx, pos, cablesSet, socketsSet) {
    const p = gridToScreen(pos.x, pos.y);
    const cx = p.x;
    const cy = p.y + 16; 

    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.fillStyle = '#00ccff';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);

    ctx.beginPath();
    if (cablesSet.has(`${pos.x},${pos.y-1}`) || socketsSet.has(`${pos.x},${pos.y-1}`)) {
        const pN = gridToScreen(pos.x, pos.y - 1);
        ctx.moveTo(cx, cy); ctx.lineTo(pN.x, pN.y + 16);
    }
    if (cablesSet.has(`${pos.x},${pos.y+1}`) || socketsSet.has(`${pos.x},${pos.y+1}`)) {
        const pS = gridToScreen(pos.x, pos.y + 1);
        ctx.moveTo(cx, cy); ctx.lineTo(pS.x, pS.y + 16);
    }
    if (cablesSet.has(`${pos.x+1},${pos.y}`) || socketsSet.has(`${pos.x+1},${pos.y}`)) {
        const pE = gridToScreen(pos.x + 1, pos.y);
        ctx.moveTo(cx, cy); ctx.lineTo(pE.x, pE.y + 16);
    }
    if (cablesSet.has(`${pos.x-1},${pos.y}`) || socketsSet.has(`${pos.x-1},${pos.y}`)) {
        const pW = gridToScreen(pos.x - 1, pos.y);
        ctx.moveTo(cx, cy); ctx.lineTo(pW.x, pW.y + 16);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}

export function drawSubsoilCable(ctx, pos) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = '#005577';
    ctx.fillRect(p.x - 4, p.y + 14, 8, 4);
}