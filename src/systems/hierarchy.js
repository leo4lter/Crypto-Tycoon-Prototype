
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
            if (this.ecs.entities.has(parentId) && this.ecs.components.position.has(parentId)) {
                const parentPos = this.ecs.components.position.get(parentId);
                const childPos = this.ecs.components.position.get(childId);

                // 1. Sync Base Grid Position
                childPos.x = parentPos.x;
                childPos.y = parentPos.y;

                // 2. Rack Stacking Logic
                // Check if the parent entity is actually a 'rack'
                const isRack = this.ecs.components.rack && this.ecs.components.rack.has(parentId);

                if (isRack) {
                    const slotIndex = parentComp.slotIndex || 0;

                    // Calculate Z (Height)
                    // Base height from parent (usually 0) + Slot Height
                    const parentZ = parentPos.z || 0;
                    childPos.z = parentZ + (slotIndex * 15);

                    // Calculate Local Offsets for Side-by-Side placement
                    // Even indices slightly to one side, Odd to the other
                    const isEven = (slotIndex % 2 === 0);
                    // Adjust these values to shift them visually within the tile
                    childPos.offsetX = isEven ? -2 : 2;
                    childPos.offsetY = isEven ? -2 : 2;

                } else {
                    // Default behavior for non-rack parents
                    childPos.z = parentPos.z || 0;
                    childPos.offsetX = 0;
                    childPos.offsetY = 0;
                }
            }
        }
    }
}
