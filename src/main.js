import { Game } from './core/game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const game = new Game(ctx);

function loop(t) {
    game.update(t);
    game.draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);