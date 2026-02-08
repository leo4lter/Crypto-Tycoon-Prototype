
export class HierarchySystem {
    constructor(ecs) {
        this.ecs = ecs;
    }

    update() {
        // Iterate over entities that have both 'parent' and 'position' components
        const children = this.ecs.getEntitiesWith('parent', 'position');

        for (const childId of children) {
            const parentComp = this.ecs.components.parent.get(childId);
            const parentId = parentComp.parentId;

            // Check if parent entity exists and has position
            // We use 'this.ecs.entities.has(parentId)' to ensure parent is alive
            if (this.ecs.entities.has(parentId) && this.ecs.components.position.has(parentId)) {
                const parentPos = this.ecs.components.position.get(parentId);
                const childPos = this.ecs.components.position.get(childId);

                // Update child position to match parent position
                // Logic: In this game, children (like miners in racks) occupy the same grid cell as the parent.
                // Visual offset is handled by the renderer using 'slotIndex' or similar properties.
                childPos.x = parentPos.x;
                childPos.y = parentPos.y;
            }
        }
    }
}
