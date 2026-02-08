export const Assets = {
    sprites: {},
    loaded: false,

    async loadAll() {
        const toLoad = {
            'rack_basic': './assets/sprites/rack_wire_full.svg',
            'miner_basic': './assets/sprites/pc_tower.svg', 
            'ac_wall': './assets/sprites/ac_wall.svg'
        };

        const promises = Object.entries(toLoad).map(([key, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.sprites[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Error: No se encontró el asset en ${url}`);
                    resolve(); 
                };
                img.src = url;
            });
        });

        await Promise.all(promises);
        this.loaded = true;
    }
};