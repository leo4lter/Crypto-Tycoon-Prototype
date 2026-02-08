import { Store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { Assets } from '../core/loader.js';

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

        // Mostrar flechas también en el ghost
        drawAirflowArrow(ctx, p.x, drawY, rotation);

    } else if (mode === 'rack') {
        drawRack(ctx, { x, y }, true);
        ctx.fillStyle = tint;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(p.x - 20, p.y - 95, 40, 100);
    } else if (mode === 'cable') {
        // Visualización de conector de cable
        const cy = p.y + 16;
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.arc(p.x, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
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

    if (pos.offsetX) p.x += pos.offsetX;
    if (pos.offsetY) p.y += pos.offsetY;

    let elevation = 0;
    if (typeof pos.z === 'number') {
        elevation = pos.z;
    } else {
        const slot = pos.slotIndex || 0;
        const baseOffset = forcedElevation > 0 ? 10 : 0;
        elevation = baseOffset + (slot * 14);
    }

    const drawY = p.y - elevation;

    // Sprite Logic
    if (Assets.loaded && Assets.sprites['miner_basic']) {
        ctx.save();

        // Aplicar filtros de visualización
        if (Store.viewMode === 'temperature' || Store.viewMode === 'electricity') {
            ctx.filter = 'grayscale(100%) opacity(0.5)';
        }
        if (grayscale) { // Para ghosts o capas ocultas
             ctx.filter = 'grayscale(100%) opacity(0.3)';
        }

        ctx.drawImage(Assets.sprites['miner_basic'], p.x - 16, drawY - 16, 32, 32);
        ctx.restore();

        // LED Indicator (Solo en modo normal o electrico si no es ghost)
        if (!grayscale && pos.on) {
             const time = performance.now();
             const ledColor = (Math.floor(time / 200) % 2 === 0) ? '#00ff00' : '#00aa00';
             ctx.fillStyle = ledColor;
             // Ajuste visual para el sprite
             ctx.fillRect(p.x - 6, drawY + 8, 3, 3);
        }

    } else {
        // Fallback primitivo
        let bodyColor = pos.on ? '#00ff88' : '#555';
        if (!grayscale && pos.modelColor) bodyColor = pos.modelColor;
        if (grayscale || Store.viewMode !== 'normal') bodyColor = '#444';

        ctx.fillStyle = bodyColor;
        ctx.fillRect(p.x - 8, drawY + 6, 16, 12);

        if (pos.on && !grayscale) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(p.x - 2, drawY + 8, 4, 4);
        }
    }

    // Dibujar Flechas de Flujo de Aire (si estamos en modo térmico o construyendo)
    // Forzamos dibujo incluso si grayscale es true (ghost) si es buildMode
    if (Store.viewMode === 'temperature' || Store.buildMode === 'miner') {
        // En modo térmico, dibujar flechas siempre para mineros existentes
        // Si es ghost (grayscale true), dibujar también si estamos construyendo minero
        if (!grayscale || Store.buildMode === 'miner') {
             drawAirflowArrow(ctx, p.x, drawY, pos.rotation || 0);
        }
    }
}

export function drawRack(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    const baseY = p.y + 10; 
    
    if (Assets.loaded && Assets.sprites['rack_basic']) {
        ctx.save();
        if (Store.viewMode === 'temperature' || Store.viewMode === 'electricity') {
            ctx.filter = 'grayscale(100%) opacity(0.5)';
        }
        if (grayscale) {
             ctx.filter = 'grayscale(100%) opacity(0.3)';
        }
        ctx.drawImage(Assets.sprites['rack_basic'], p.x - 32, baseY - 110, 64, 115);
        ctx.restore();
    } else {
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
    // Rojo oscuro mate para denotar aislamiento/tela
    ctx.fillStyle = grayscale ? 'rgba(0, 0, 0, 0.2)' : '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 14);
    ctx.lineTo(p.x + 24, p.y + 26);
    ctx.lineTo(p.x, p.y + 38);
    ctx.lineTo(p.x - 24, p.y + 26);
    ctx.closePath();
    ctx.fill();
    // Textura simple (ruido)
    if (!grayscale) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(p.x - 5, p.y + 24, 4, 4);
        ctx.fillRect(p.x + 5, p.y + 28, 4, 4);
    }
}

export function drawACUnit(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    const drawY = p.y - 10;

    ctx.fillStyle = grayscale ? '#444' : '#dbeafe'; // Blanco azulado
    ctx.fillRect(p.x - 12, drawY, 24, 20);

    // Ventilador
    ctx.fillStyle = grayscale ? '#222' : '#1e40af';
    ctx.beginPath();
    ctx.arc(p.x, drawY + 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Aspas girando (simulado)
    const time = performance.now() / 100;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(time)*8, drawY+10 + Math.sin(time)*8);
    ctx.lineTo(p.x - Math.cos(time)*8, drawY+10 - Math.sin(time)*8);
    ctx.stroke();
}

export function drawWallAC(ctx, pos, grayscale = false) {
    const p = gridToScreen(pos.x, pos.y);
    // Pegado arriba ("pared")
    const drawY = p.y - 30;

    ctx.fillStyle = grayscale ? '#333' : '#e2e8f0';
    ctx.fillRect(p.x - 14, drawY, 28, 12);

    // Rejillas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(p.x - 10, drawY + 2, 20, 2);
    ctx.fillRect(p.x - 10, drawY + 6, 20, 2);
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

function drawAirflowArrow(ctx, x, y, rotation) {
    ctx.save();
    ctx.translate(x, y + 6);

    // Lógica Invertida según instrucciones:
    // Flecha ROJA (Salida) = Espalda del Sprite.
    // Flecha AZUL (Entrada) = Frente del Sprite.

    // Rotación Sprite (Visual):
    // 0: Norte (Arriba-Derecha en ISO estándar? No, gridToScreen logic: -Y es Norte visual. +X es Este visual.)
    // Vamos a asumir la lógica de simulación actual como verdad absoluta para "Espalda":
    // Rot 0 -> Espalda Sur. (Salida Roja al Sur).

    let angle = 0;
    // Sur visual (Espalda de Rot 0) es +Y en grid => Abajo-Izquierda en Pantalla. (+135 deg)
    if (rotation === 0) angle = Math.PI * 0.75;
    else if (rotation === 1) angle = -Math.PI * 0.75; // Oeste (Arriba-Izq)
    else if (rotation === 2) angle = -Math.PI * 0.25; // Norte (Arriba-Der)
    else if (rotation === 3) angle = Math.PI * 0.25;  // Este (Abajo-Der)

    ctx.rotate(angle);

    // Flecha Roja (Salida de Calor - Espalda)
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flecha Cian (Entrada de Aire - Opuesta)
    ctx.rotate(Math.PI);
    ctx.fillStyle = '#06b6d4';

    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -3);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}