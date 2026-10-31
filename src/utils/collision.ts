/**
 * DecorHub Collision & Layout Validation Engine
 */

import { PlacedItem, RoomDimensions, ValidationIssue } from '../types';
import { getCatalogItemById } from '../data/furnitureCatalog';
import { boxesOverlap, getItemBoundingBox, isBoxInsideRoom } from './geometry';

export function validateRoomLayout(
  items: PlacedItem[],
  room: RoomDimensions
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check Out of Bounds
  for (const item of items) {
    const box = getItemBoundingBox(item);
    const catalog = getCatalogItemById(item.itemId);
    const name = catalog ? catalog.name : 'Item';

    if (!isBoxInsideRoom(box, room)) {
      issues.push({
        id: `oob_${item.instanceId}`,
        type: 'out_of_bounds',
        severity: 'error',
        message: `"${name}" extends outside room boundaries. Move it inside the walls.`,
        involvedInstanceIds: [item.instanceId],
      });
    }
  }

  // 2. Check Overlaps between items
  // Note: Rugs are floor coverings, so other items can be placed on top of rugs!
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];
      const catA = getCatalogItemById(itemA.itemId);
      const catB = getCatalogItemById(itemB.itemId);

      // Skip collision if one of them is a rug
      if (catA?.category === 'rugs' || catB?.category === 'rugs') {
        continue;
      }

      const boxA = getItemBoundingBox(itemA);
      const boxB = getItemBoundingBox(itemB);

      if (boxesOverlap(boxA, boxB, 3)) {
        issues.push({
          id: `collision_${itemA.instanceId}_${itemB.instanceId}`,
          type: 'collision',
          severity: 'error',
          message: `Overlap detected between "${catA?.name || 'Item 1'}" and "${catB?.name || 'Item 2'}".`,
          involvedInstanceIds: [itemA.instanceId, itemB.instanceId],
        });
      }
    }
  }

  // 3. Check Door Swing Obstruction
  const door = room.door;
  if (door) {
    // Determine door swing zone bounding box approx
    let doorZoneMinX = 0;
    let doorZoneMaxX = 0;
    let doorZoneMinY = 0;
    let doorZoneMaxY = 0;

    const dw = door.widthCm || 90;
    const dp = door.positionCm || 30;

    switch (door.wall) {
      case 'south': // Door on south wall (y = room.widthCm)
        doorZoneMinX = dp;
        doorZoneMaxX = dp + dw;
        doorZoneMinY = room.widthCm - dw;
        doorZoneMaxY = room.widthCm;
        break;
      case 'north': // Door on north wall (y = 0)
        doorZoneMinX = dp;
        doorZoneMaxX = dp + dw;
        doorZoneMinY = 0;
        doorZoneMaxY = dw;
        break;
      case 'west': // Door on west wall (x = 0)
        doorZoneMinX = 0;
        doorZoneMaxX = dw;
        doorZoneMinY = dp;
        doorZoneMaxY = dp + dw;
        break;
      case 'east': // Door on east wall (x = room.lengthCm)
        doorZoneMinX = room.lengthCm - dw;
        doorZoneMaxX = room.lengthCm;
        doorZoneMinY = dp;
        doorZoneMaxY = dp + dw;
        break;
    }

    const doorZoneBox = {
      minX: doorZoneMinX,
      minY: doorZoneMinY,
      maxX: doorZoneMaxX,
      maxY: doorZoneMaxY,
      width: doorZoneMaxX - doorZoneMinX,
      height: doorZoneMaxY - doorZoneMinY,
    };

    for (const item of items) {
      const cat = getCatalogItemById(item.itemId);
      // Rugs are flat on floor, won't block door unless very thick, but warn if solid furniture is in door zone
      if (cat?.category === 'rugs') continue;

      const itemBox = getItemBoundingBox(item);
      if (boxesOverlap(itemBox, doorZoneBox, 5)) {
        issues.push({
          id: `door_block_${item.instanceId}`,
          type: 'door_obstruction',
          severity: 'warning',
          message: `"${cat?.name || 'Furniture'}" blocks the door swing path. Keep entrance clear for safe passage.`,
          involvedInstanceIds: [item.instanceId],
        });
      }
    }
  }

  // 4. Check Window Obstruction (tall furniture blocking windows)
  if (room.windows && room.windows.length > 0) {
    for (const win of room.windows) {
      for (const item of items) {
        const cat = getCatalogItemById(item.itemId);
        // If item height is > 140cm (like wardrobes or tall bookshelves)
        const height = cat?.dimensions.heightCm || 0;
        if (height < 140) continue;

        const box = getItemBoundingBox(item);
        const winWidth = win.widthCm || 120;
        const winPos = win.positionCm || 60;

        let overlapsWindow = false;
        if (win.wall === 'north' && box.minY <= 40) {
          if (box.maxX > winPos && box.minX < winPos + winWidth) overlapsWindow = true;
        } else if (win.wall === 'south' && box.maxY >= room.widthCm - 40) {
          if (box.maxX > winPos && box.minX < winPos + winWidth) overlapsWindow = true;
        } else if (win.wall === 'west' && box.minX <= 40) {
          if (box.maxY > winPos && box.minY < winPos + winWidth) overlapsWindow = true;
        } else if (win.wall === 'east' && box.maxX >= room.lengthCm - 40) {
          if (box.maxY > winPos && box.minY < winPos + winWidth) overlapsWindow = true;
        }

        if (overlapsWindow) {
          issues.push({
            id: `window_block_${item.instanceId}_${win.id}`,
            type: 'window_obstruction',
            severity: 'warning',
            message: `Tall item "${cat?.name}" is blocking natural daylight from the ${win.wall} window.`,
            involvedInstanceIds: [item.instanceId],
          });
        }
      }
    }
  }

  // 5. Check Structural Obstructions (pillars)
  if (room.obstructions && room.obstructions.length > 0) {
    for (const obst of room.obstructions) {
      const obstBox = {
        minX: obst.xCm,
        minY: obst.yCm,
        maxX: obst.xCm + obst.widthCm,
        maxY: obst.yCm + obst.depthCm,
        width: obst.widthCm,
        height: obst.depthCm,
      };

      for (const item of items) {
        const cat = getCatalogItemById(item.itemId);
        if (cat?.category === 'rugs') continue;
        const itemBox = getItemBoundingBox(item);

        if (boxesOverlap(itemBox, obstBox, 2)) {
          issues.push({
            id: `obstruction_${item.instanceId}_${obst.id}`,
            type: 'collision',
            severity: 'error',
            message: `"${cat?.name || 'Item'}" collides with architectural obstruction: ${obst.label}.`,
            involvedInstanceIds: [item.instanceId],
          });
        }
      }
    }
  }

  return issues;
}
