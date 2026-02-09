import { Game } from './core/game.js';
import { Store } from './core/store.js';
import { Assets } from './core/loader.js'; // <--- Faltaba importar esto

window.addCash = (amount = 10000) => {
    Store.economy.usd += amount;
    console.log(`[GM] Añadidos $${amount}. Saldo actual: $${Store.economy.usd}`);
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const game = new Game(ctx);

// INICIALIZACIÓN: Cargamos imágenes antes de arrancar
Assets.loadAll().then(() => {
    console.log("Assets cargados. Iniciando loop.");
    requestAnimationFrame(loop);
});

let lastTime = 0;
function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    game.update(dt); // Pasamos dt (delta time) importante para animaciones
    game.draw();
    requestAnimationFrame(loop);
}