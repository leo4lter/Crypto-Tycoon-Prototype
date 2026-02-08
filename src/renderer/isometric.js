import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';

export function gridToScreen(x, y) {
    return {
        x: (x - y) * (CONFIG.TILE_W / 2) + CONFIG.ORIGIN_X,
        y: (x + y) * (CONFIG.TILE_H / 2) + CONFIG.ORIGIN_Y,
    };
}

export function screenToGrid(x, y) {
    let dx = x - CONFIG.ORIGIN_X;
    let dy = y - CONFIG.ORIGIN_Y;
    const gx = Math.floor((dy / (CONFIG.TILE_H / 2) + dx / (CONFIG.TILE_W / 2)) / 2);
    const gy = Math.floor((dy / (CONFIG.TILE_H / 2) - dx / (CONFIG.TILE_W / 2)) / 2);
    return { gx, gy };
}

export function drawGrid(ctx, dim = false) {
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
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
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
            const value = map[x + y * CONFIG.GRID_SIZE];
            drawDiamond(ctx, x, y, colorFn(value));
        }
    }
}

function drawDiamond(ctx, x, y, color, strokeColor) {
    const p = gridToScreen(x, y);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + CONFIG.TILE_W / 2, p.y + CONFIG.TILE_H / 2);
    ctx.lineTo(p.x, p.y + CONFIG.TILE_H);
    ctx.lineTo(p.x - CONFIG.TILE_W / 2, p.y + CONFIG.TILE_H / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
}

export function drawGhost(ctx, mode, x, y, isValid, rotation) {
    const p = gridToScreen(x, y);
    ctx.save();
    ctx.globalAlpha = 0.6;
    const tint = isValid ? '#00ff00' : '#ff0000';

    if (mode === 'miner') {
        const drawY = p.y;
        ctx.fillStyle = isValid ? '#00ff88' : '#ff0000';
        ctx.fillRect(p.x - 8, drawY + 6, 16, 12);
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = p.x; const cy = drawY + 6;
        if (rotation === 0) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy + 3); } 
        else if (rotation === 1) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 6, cy + 3); } 
        else if (rotation === 2) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 6, cy - 3); } 
        else if (rotation === 3) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy - 3); }
        ctx.stroke();

    } else if (mode === 'rack') {
        drawRack(ctx, { x, y }, true);
        ctx.fillStyle = tint;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(p.x - 20, p.y - 95, 40, 100);
    } else {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + CONFIG.TILE_W / 2, p.y + CONFIG.TILE_H / 2);
        ctx.lineTo(p.x, p.y + CONFIG.TILE_H);
        ctx.lineTo(p.x - CONFIG.TILE_W / 2, p.y + CONFIG.TILE_H / 2);
        ctx.closePath();
        ctx.fillStyle = tint;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }
    ctx.restore();
}

export function drawMiner(ctx, pos, forcedElevation = 0, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
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

    ctx.fillStyle = bodyColor;
    ctx.fillRect(p.x - 8, drawY + 6, 16, 12);
    
    if (pos.on && !grayscale) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 2, drawY + 8, 4, 4);
    }

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

    ctx.fillStyle = colorBase;
    ctx.fillRect(p.x - 20, baseY - 5, 40, 5); 

    ctx.fillStyle = colorPilar;
    ctx.fillRect(p.x - 20, baseY - 95, 4, 95); 
    ctx.fillRect(p.x + 16, baseY - 95, 4, 95); 

    ctx.fillStyle = colorBase;
    ctx.fillRect(p.x - 20, baseY - 35, 40, 2); 
    ctx.fillRect(p.x - 20, baseY - 65, 40, 2); 
    
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

    const neighbors = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
    ];

    for (const n of neighbors) {
        const nx = pos.x + n.dx;
        const ny = pos.y + n.dy;
        const key = Utils.key(nx, ny);

        if (cablesSet.has(key) || socketsSet.has(key)) {
            const pn = gridToScreen(nx, ny);
            ctx.moveTo(cx, cy);
            ctx.lineTo(pn.x, pn.y + 16);
        }
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}

export function drawSubsoilCable(ctx, pos) {
    const p = gridToScreen(pos.x, pos.y);
    ctx.fillStyle = '#005577';
    ctx.fillRect(p.x - 4, p.y + 14, 8, 4);
}