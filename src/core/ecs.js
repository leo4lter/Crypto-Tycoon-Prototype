export class ECS {
    constructor() {
        this.nextId = 1;
        this.entities = new Set();
        this.components = {};
    }

    createEntity() {
        const id = this.nextId++;
        this.entities.add(id);
        return id;
    }

    addComponent(entity, name, data) {
        if (!this.components[name]) {
            this.components[name] = new Map();
        }
        this.components[name].set(entity, data);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
        for (const comp of Object.values(this.components)) {
            comp.delete(entity);
        }
    }

    getEntitiesWith(...names) {
        return [...this.entities].filter((e) =>
            names.every(
                (n) => this.components[n]?.has(e)
            )
        );
    }
}
