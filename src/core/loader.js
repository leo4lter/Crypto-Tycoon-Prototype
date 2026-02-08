
export const Assets = {
    sprites: {},
    loaded: false,

    async loadAll() {
        const toLoad = {
            'rack_basic': 'assets/sprites/rack_wire_full.svg',
            'miner_basic': 'assets/sprites/pc_tower_full.svg'
        };

        const promises = Object.entries(toLoad).map(([key, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.sprites[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load asset: ${url}`);
                    resolve(); // Resolve anyway to not block game
                };
                img.src = url;
            });
        });

        await Promise.all(promises);
        this.loaded = true;
        console.log('Assets loaded');
    }
};
