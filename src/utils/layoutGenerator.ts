/**
 * DecorHub Rule-Based Layout Generation Engine
 *
 * Enforces strict Room-Type Compatibility and separates:
 * A. Existing furniture (isOwned: true) - Retained asset
 * B. Requested furniture (status: 'selected') - Core Bill of Materials
 * C. AI suggestions (isSuggested: true) - Optional recommendations
 *
 * NEVER invents unwanted furniture, never dumps living-room sofas into study rooms,
 * and leaves the purchase BOM empty if the user selected no furniture.
 */

import {
  LayoutAlternative,
  PlacedItem,
  QuestionnaireData,
  RoomDimensions,
  FurnitureCategory,
  RoomType,
} from '../types';
import { FURNITURE_CATALOG, getCatalogItemById } from '../data/furnitureCatalog';

/**
 * Strict category allowance map per room type
 */
export const ROOM_TYPE_ALLOWED_CATEGORIES: Record<RoomType, FurnitureCategory[]> = {
  study_room: ['desks', 'chairs', 'bookshelves', 'lighting', 'storage', 'rugs', 'decor_plants'],
  home_office: ['desks', 'chairs', 'bookshelves', 'lighting', 'storage', 'rugs', 'decor_plants'],
  bedroom: ['beds', 'tables', 'wardrobes', 'lighting', 'rugs', 'storage', 'chairs', 'desks', 'decor_plants'],
  guest_room: ['beds', 'tables', 'wardrobes', 'lighting', 'rugs', 'storage', 'chairs', 'desks', 'decor_plants'],
  living_room: ['sofas', 'tables', 'chairs', 'tv_units', 'bookshelves', 'storage', 'lighting', 'rugs', 'decor_plants'],
  dining_room: ['tables', 'chairs', 'storage', 'lighting', 'rugs', 'decor_plants'],
  studio_apartment: ['beds', 'sofas', 'desks', 'chairs', 'tables', 'wardrobes', 'storage', 'tv_units', 'lighting', 'rugs', 'decor_plants'],
  other: ['desks', 'chairs', 'tables', 'storage', 'bookshelves', 'lighting', 'rugs', 'decor_plants', 'sofas', 'beds', 'wardrobes', 'tv_units'],
};

/**
 * Helper: Door obstruction check
 */
function isPositionBlockingDoor(
  x: number,
  y: number,
  width: number,
  height: number,
  room: RoomDimensions
): boolean {
  const door = room.door;
  const dw = door?.widthCm || 90;
  const dp = door?.positionCm || 30;
  const clearance = 25;

  let doorBox = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  switch (door?.wall || 'south') {
    case 'south':
      doorBox = { minX: dp - clearance, maxX: dp + dw + clearance, minY: room.widthCm - dw - clearance, maxY: room.widthCm };
      break;
    case 'north':
      doorBox = { minX: dp - clearance, maxX: dp + dw + clearance, minY: 0, maxY: dw + clearance };
      break;
    case 'west':
      doorBox = { minX: 0, maxX: dw + clearance, minY: dp - clearance, maxY: dp + dw + clearance };
      break;
    case 'east':
      doorBox = { minX: room.lengthCm - dw - clearance, maxX: room.lengthCm, minY: dp - clearance, maxY: dp + dw + clearance };
      break;
  }

  const itemMaxX = x + width;
  const itemMaxY = y + height;

  return !(
    itemMaxX <= doorBox.minX ||
    x >= doorBox.maxX ||
    itemMaxY <= doorBox.minY ||
    y >= doorBox.maxY
  );
}

/**
 * Finds catalog item matching category, style, and budget preferences
 */
function findBestCatalogItem(
  category: FurnitureCategory,
  styleMatch: string,
  preferBudget: boolean,
  fallbackId: string
): string {
  const items = FURNITURE_CATALOG.filter((i) => i.category === category);
  if (items.length === 0) return fallbackId;

  if (preferBudget) {
    const budgetItem = items.find((i) => i.priceTier === 'budget');
    if (budgetItem) return budgetItem.id;
  }

  const styled = items.find((i) => i.style.includes(styleMatch as any));
  if (styled) return styled.id;

  return items[0].id;
}

/**
 * Core builder that places strictly requested, owned, or optional items
 */
/**
 * Core builder that places strictly requested, owned, or optional items
 * Produces genuinely different layouts for:
 * - 'space_efficient' (Layout A): Perimeter arrangement, compact footprints, max open floor & clearance
 * - 'comfort_focused' (Layout B): Symmetrical & ergonomic balance, cozy conversation / reading nooks, accessible reach
 * - 'storage_focused' (Layout C): Maximum storage capacity, extra wardrobes, credenzas, vertical bookshelves
 */
function buildRoomItems(
  data: QuestionnaireData,
  variation: 'space_efficient' | 'comfort_focused' | 'storage_focused',
  preferBudget: boolean,
  existingItems?: PlacedItem[]
): PlacedItem[] {
  const { dimensions, roomType, style, functionalNeeds } = data;
  const items: PlacedItem[] = [];
  const allowed = ROOM_TYPE_ALLOWED_CATEGORIES[roomType] || ROOM_TYPE_ALLOWED_CATEGORIES.other;
  const needs = functionalNeeds?.furnitureNeeds || {};

  // 1. Include user's confirmed existing furniture items (₹0 purchase cost)
  if (existingItems && existingItems.length > 0) {
    for (const ext of existingItems) {
      const cat = getCatalogItemById(ext.itemId);
      const w = ext.customDimensions?.widthCm || cat?.dimensions.widthCm || 100;
      const d = ext.customDimensions?.depthCm || cat?.dimensions.depthCm || 80;

      let targetX = ext.xCm;
      let targetY = ext.yCm;
      let targetRot = ext.rotationDeg;

      // Adjust disposition for variation if user marked reposition or for variation optimization
      if (variation === 'space_efficient') {
        // In space-efficient mode, tuck existing furniture closer to nearest perimeter wall
        if (ext.ownedAction === 'reposition' || targetX > dimensions.lengthCm / 3 && targetX < (dimensions.lengthCm * 2) / 3) {
          targetX = targetX < dimensions.lengthCm / 2 ? 25 : dimensions.lengthCm - w - 25;
        }
      } else if (variation === 'comfort_focused') {
        // In comfort mode, ensure comfortable reach from room center / window
        if (ext.ownedAction === 'rotate') {
          targetRot = (targetRot + 90) % 360;
        }
      }

      const clampedX = Math.max(15, Math.min(dimensions.lengthCm - w - 15, targetX));
      const clampedY = Math.max(15, Math.min(dimensions.widthCm - d - 15, targetY));

      items.push({
        ...ext,
        xCm: clampedX,
        yCm: clampedY,
        rotationDeg: targetRot,
        isOwned: true,
        status: 'owned',
        isSuggested: false,
      });
    }
  }

  // Helper to check requirement status for a category
  // Returns: 'required' | 'owned' | 'optional' | 'none'
  const getStatus = (cat: FurnitureCategory): 'required' | 'owned' | 'optional' | 'none' => {
    // If an existing item already covers this category, don't force a new duplicate purchase unless requested
    const alreadyCovered = items.some((it) => {
      const c = getCatalogItemById(it.itemId);
      return c?.category === cat;
    });
    if (alreadyCovered && needs[cat] !== 'required') {
      return 'none';
    }
    // If not allowed for this room type, strictly exclude unless user explicitly asked for it
    if (!allowed.includes(cat) && needs[cat] !== 'required' && needs[cat] !== 'owned') {
      return 'none';
    }
    return needs[cat] || 'none';
  };

  // Helper to create a placed item with accurate ownership & suggestion flags
  const addItem = (
    instanceId: string,
    cat: FurnitureCategory,
    defaultId: string,
    xCm: number,
    yCm: number,
    rotationDeg: number = 0,
    forceSuggestion: boolean = false
  ) => {
    const status = getStatus(cat);
    if (status === 'none') return; // User excluded or not requested

    const itemId = findBestCatalogItem(cat, style.primaryStyle, preferBudget, defaultId);
    const catalogItem = getCatalogItemById(itemId);
    if (!catalogItem) return;

    // Check bounds
    const clampedX = Math.max(15, Math.min(dimensions.lengthCm - catalogItem.dimensions.widthCm - 15, xCm));
    const clampedY = Math.max(15, Math.min(dimensions.widthCm - catalogItem.dimensions.depthCm - 15, yCm));

    // Door check
    if (isPositionBlockingDoor(clampedX, clampedY, catalogItem.dimensions.widthCm, catalogItem.dimensions.depthCm, dimensions)) {
      return;
    }

    const isOwned = status === 'owned';
    const isSuggested = !isOwned && (status === 'optional' || forceSuggestion);

    items.push({
      instanceId,
      itemId,
      xCm: clampedX,
      yCm: clampedY,
      rotationDeg,
      isOwned,
      isSuggested,
      status: isOwned ? 'owned' : isSuggested ? 'suggested' : 'selected',
      quantity: 1,
    });
  };

  // =========================================================================
  // ROOM TYPE: Bedroom / Guest Room
  // =========================================================================
  if (roomType === 'bedroom' || roomType === 'guest_room') {
    if (variation === 'space_efficient') {
      // LAYOUT A: Perimeter alignment, maximum open center & unblocked thoroughfare
      if (getStatus('beds') !== 'none') {
        const bedId = preferBudget ? 'bed_scandi_compact' : 'bed_japandi_queen';
        const bedCat = getCatalogItemById(bedId)!;
        // Bed pushed towards perimeter wall to open up room center
        const bedX = 30;
        const bedY = 25;
        addItem('inst_bed', 'beds', bedId, bedX, bedY, 0);

        // Single compact nightstand on the open side
        if (getStatus('tables') !== 'none') {
          addItem('inst_nightstand_r', 'tables', 'table_side_pedestal', bedX + bedCat.dimensions.widthCm + 15, bedY + 10, 0);
        }
      }

      // Compact wardrobe flush in corner
      if (getStatus('wardrobes') !== 'none') {
        const wardId = preferBudget ? 'wardrobe_2door_sliding' : 'wardrobe_walkin_modular';
        const wardX = dimensions.lengthCm - 140;
        const wardY = Math.max(30, dimensions.widthCm - 160);
        addItem('inst_wardrobe', 'wardrobes', wardId, wardX, wardY, 0);
      }

      // Desk tucked in far corner if requested
      if (getStatus('desks') !== 'none') {
        const deskId = 'desk_student_compact';
        addItem('inst_bed_desk', 'desks', deskId, dimensions.lengthCm - 130, 25, 0);
        if (getStatus('chairs') !== 'none') {
          addItem('inst_bed_chair', 'chairs', 'chair_task_budget', dimensions.lengthCm - 100, 85, 180);
        }
      }

      // Perimeter floor runner rug
      if (getStatus('rugs') !== 'none') {
        addItem('inst_bed_rug', 'rugs', 'rug_jute_organic', 35, 130, 0);
      }

      // Slim corner lighting
      if (getStatus('lighting') !== 'none') {
        addItem('inst_bed_lamp', 'lighting', 'lamp_ceramic_table', dimensions.lengthCm - 55, 30, 0);
      }
    } else if (variation === 'comfort_focused') {
      // LAYOUT B: Ergonomic sanctuary, balanced bilateral symmetry, dual nightstands, reading nook
      if (getStatus('beds') !== 'none') {
        const bedId = preferBudget ? 'bed_scandi_compact' : 'bed_japandi_queen';
        const bedCat = getCatalogItemById(bedId)!;
        // Symmetrically centered along North focal wall
        const bedX = Math.max(25, Math.floor((dimensions.lengthCm - bedCat.dimensions.widthCm) / 2));
        const bedY = 25;
        addItem('inst_bed', 'beds', bedId, bedX, bedY, 0);

        // DUAL nightstands on BOTH sides within arm's reach
        if (getStatus('tables') !== 'none') {
          addItem('inst_nightstand_l', 'tables', 'table_side_pedestal', Math.max(10, bedX - 55), bedY + 5, 0);
          if (dimensions.lengthCm >= 330) {
            addItem('inst_nightstand_r', 'tables', 'table_side_pedestal', bedX + bedCat.dimensions.widthCm + 15, bedY + 5, 0);
          }
        }
      }

      // Wardrobe along side wall with generous dressing clearance
      if (getStatus('wardrobes') !== 'none') {
        addItem('inst_wardrobe', 'wardrobes', 'wardrobe_walkin_modular', 20, Math.min(dimensions.widthCm - 160, 220), 90);
      }

      // Cozy reading armchair angled near window corner
      if (getStatus('chairs') !== 'none') {
        addItem('inst_reading_chair', 'chairs', 'armchair_rattan', dimensions.lengthCm - 95, dimensions.widthCm - 95, 315);
      }

      // Arc floor lamp creating ambient acoustic softness
      if (getStatus('lighting') !== 'none') {
        addItem('inst_bed_lamp', 'lighting', 'lamp_arc_floor', dimensions.lengthCm - 60, dimensions.widthCm - 60, 0);
      }

      // Large plush area rug anchoring the bed & morning step-out zone
      if (getStatus('rugs') !== 'none') {
        addItem('inst_bed_rug', 'rugs', 'rug_geo_terracotta', Math.max(20, Math.floor((dimensions.lengthCm - 200) / 2)), 95, 0);
      }

      if (getStatus('decor_plants') !== 'none') {
        addItem('inst_bed_plant', 'decor_plants', 'plant_fiddle_leaf', dimensions.lengthCm - 55, 30, 0);
      }
    } else {
      // LAYOUT C: Maximum storage capacity, under-bed storage, extended wardrobes & credenza
      if (getStatus('beds') !== 'none') {
        const bedId = 'bed_sheesham_storage';
        const bedCat = getCatalogItemById(bedId)!;
        const bedX = 40;
        const bedY = 25;
        addItem('inst_bed', 'beds', bedId, bedX, bedY, 0);

        if (getStatus('tables') !== 'none') {
          addItem('inst_nightstand_r', 'tables', 'table_side_pedestal', bedX + bedCat.dimensions.widthCm + 15, bedY + 10, 0);
        }
      }

      // Primary Modular Wardrobe
      if (getStatus('wardrobes') !== 'none') {
        const wardId = 'wardrobe_walkin_modular';
        addItem('inst_wardrobe', 'wardrobes', wardId, 25, Math.min(dimensions.widthCm - 160, 220), 90);
      }

      // SECOND STORAGE UNIT: Rattan Sideboard Credenza for folded clothes, bed linens & organizers
      if (getStatus('storage') !== 'none' || dimensions.lengthCm > 320) {
        addItem('inst_bed_credenza', 'storage', 'credenza_rattan_sideboard', dimensions.lengthCm - 150, Math.max(30, dimensions.widthCm - 85), 0);
      }

      // VERTICAL STORAGE UNIT: Arch bookshelf for accessories and storage bins
      if (getStatus('bookshelves') !== 'none' || dimensions.widthCm > 300) {
        addItem('inst_bed_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 35, 270);
      }

      if (getStatus('rugs') !== 'none') {
        addItem('inst_bed_rug', 'rugs', 'rug_jute_organic', 35, 120, 0);
      }

      if (getStatus('lighting') !== 'none') {
        addItem('inst_bed_lamp', 'lighting', 'lamp_ceramic_table', dimensions.lengthCm - 55, dimensions.widthCm - 65, 0);
      }
    }
  }

  // =========================================================================
  // ROOM TYPE: Living Room
  // =========================================================================
  else if (roomType === 'living_room') {
    if (variation === 'space_efficient') {
      // LAYOUT A: Perimeter mounted sofa, clear central highway, compact nesting table
      if (getStatus('sofas') !== 'none') {
        const sofaId = preferBudget ? 'sofa_scandi_2s' : 'sofa_terracotta_3s';
        // Sofa flush against North perimeter wall
        addItem('inst_living_sofa', 'sofas', sofaId, 35, 30, 0);
      }

      // Compact nesting table close to sofa
      if (getStatus('tables') !== 'none') {
        addItem('inst_coffee_table', 'tables', 'table_coffee_nesting', 50, 130, 0);
      }

      // Floating slim TV unit on opposite South wall
      if (getStatus('tv_units') !== 'none') {
        addItem('inst_living_tv', 'tv_units', 'tv_unit_floating', dimensions.lengthCm - 150, Math.max(30, dimensions.widthCm - 55), 0);
      }

      // Slim corner bookshelf
      if (getStatus('bookshelves') !== 'none') {
        addItem('inst_living_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 30, 270);
      }

      if (getStatus('rugs') !== 'none') {
        addItem('inst_living_rug', 'rugs', 'rug_jute_organic', 35, 90, 0);
      }
    } else if (variation === 'comfort_focused') {
      // LAYOUT B: Floating sofa, intimate conversation grouping, centered coffee table, accent chair
      if (getStatus('sofas') !== 'none') {
        const sofaId = preferBudget ? 'sofa_scandi_2s' : 'sofa_velvet_luxury';
        const sofaCat = getCatalogItemById(sofaId)!;
        // Floating sofa pulled into the room
        const sofaX = 65;
        const sofaY = Math.max(30, Math.floor((dimensions.widthCm - sofaCat.dimensions.widthCm) / 2));
        addItem('inst_living_sofa', 'sofas', sofaId, sofaX, sofaY, 90);

        // Centered coffee table within easy reach of all seating
        if (getStatus('tables') !== 'none') {
          addItem('inst_coffee_table', 'tables', 'table_coffee_marble', sofaX + sofaCat.dimensions.depthCm + 30, sofaY + 25, 0);
        }

        // Conversational accent armchair angled toward sofa
        if (getStatus('chairs') !== 'none') {
          addItem('inst_living_chair', 'chairs', 'armchair_rattan', sofaX + sofaCat.dimensions.depthCm + 150, sofaY + 15, 270);
        }

        // TV Unit on focal wall
        if (getStatus('tv_units') !== 'none') {
          addItem('inst_living_tv', 'tv_units', 'tv_unit_floating', dimensions.lengthCm - 150, sofaY + 20, 0);
        }
      }

      // Arc floor lamp curving gracefully over the conversation zone
      if (getStatus('lighting') !== 'none') {
        addItem('inst_living_lamp', 'lighting', 'lamp_arc_floor', 40, Math.max(25, dimensions.widthCm - 80), 0);
      }

      // Expansive rug unifying the entire seating area
      if (getStatus('rugs') !== 'none') {
        addItem('inst_living_rug', 'rugs', 'rug_geo_terracotta', 65, Math.max(20, Math.floor((dimensions.widthCm - 180) / 2)), 0);
      }

      if (getStatus('decor_plants') !== 'none') {
        addItem('inst_living_plant', 'decor_plants', 'plant_fiddle_leaf', dimensions.lengthCm - 55, dimensions.widthCm - 55, 0);
      }
    } else {
      // LAYOUT C: Complete Entertainment & Storage Wall, TV Unit + Bookshelf + Storage Credenza
      if (getStatus('sofas') !== 'none') {
        const sofaId = 'sofa_terracotta_3s';
        const sofaCat = getCatalogItemById(sofaId)!;
        addItem('inst_living_sofa', 'sofas', sofaId, 35, Math.max(30, Math.floor((dimensions.widthCm - sofaCat.dimensions.widthCm) / 2)), 90);

        if (getStatus('tables') !== 'none') {
          addItem('inst_coffee_table', 'tables', 'table_coffee_nesting', 125, Math.max(30, Math.floor((dimensions.widthCm - 80) / 2)), 0);
        }
      }

      // STORAGE WALL 1: TV Media Unit
      if (getStatus('tv_units') !== 'none') {
        addItem('inst_living_tv', 'tv_units', 'tv_unit_floating', dimensions.lengthCm - 160, Math.max(40, dimensions.widthCm / 2 - 40), 0);
      }

      // STORAGE WALL 2: Arched Bookshelf
      if (getStatus('bookshelves') !== 'none') {
        addItem('inst_living_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 30, 270);
      }

      // STORAGE WALL 3: Full Rattan Credenza Sideboard along bottom perimeter
      if (getStatus('storage') !== 'none' || dimensions.widthCm > 320) {
        addItem('inst_living_credenza', 'storage', 'credenza_rattan_sideboard', dimensions.lengthCm - 160, Math.max(30, dimensions.widthCm - 85), 0);
      }

      if (getStatus('rugs') !== 'none') {
        addItem('inst_living_rug', 'rugs', 'rug_geo_terracotta', 90, Math.max(20, Math.floor((dimensions.widthCm - 160) / 2)), 0);
      }

      if (getStatus('lighting') !== 'none') {
        addItem('inst_living_lamp', 'lighting', 'lamp_ceramic_table', dimensions.lengthCm - 55, 35, 0);
      }
    }
  }

  // =========================================================================
  // ROOM TYPE: Study Room / Home Office
  // =========================================================================
  else if (roomType === 'study_room' || roomType === 'home_office') {
    if (variation === 'space_efficient') {
      // LAYOUT A: Desk against perimeter wall, open floor space for movement & pacing
      if (getStatus('desks') !== 'none') {
        const deskId = preferBudget ? 'desk_student_compact' : 'desk_wfh_ergonomic';
        addItem('inst_study_desk', 'desks', deskId, 30, 25, 0);

        if (getStatus('chairs') !== 'none') {
          addItem('inst_study_chair', 'chairs', 'chair_task_budget', 65, 85, 180);
        }
      }

      // Compact corner bookshelf
      if (getStatus('bookshelves') !== 'none') {
        addItem('inst_study_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 30, 270);
      }

      // Perimeter floor runner rug
      if (getStatus('rugs') !== 'none') {
        addItem('inst_study_rug', 'rugs', 'rug_jute_organic', 30, 30, 0);
      }

      if (getStatus('lighting') !== 'none') {
        addItem('inst_study_lamp', 'lighting', 'lamp_ceramic_table', dimensions.lengthCm - 55, 35, 0);
      }
    } else if (variation === 'comfort_focused') {
      // LAYOUT B: Ergonomic executive desk oriented toward daylight, mesh chair, reading nook
      if (getStatus('desks') !== 'none') {
        const deskId = preferBudget ? 'desk_student_compact' : 'desk_walnut_exec';
        const deskCat = getCatalogItemById(deskId)!;
        // Floating desk positioned for window views and natural daylight
        const deskX = Math.max(30, Math.floor((dimensions.lengthCm - deskCat.dimensions.widthCm) / 2));
        const deskY = 60;
        addItem('inst_study_desk', 'desks', deskId, deskX, deskY, 0);

        // High-back ergonomic mesh chair with generous push-back clearance
        if (getStatus('chairs') !== 'none') {
          const chairId = 'chair_ergonomic_mesh';
          addItem('inst_study_chair', 'chairs', chairId, deskX + Math.floor((deskCat.dimensions.widthCm - 65) / 2), deskY + deskCat.dimensions.depthCm + 15, 180);
        }
      }

      // Relaxing reading armchair for break periods away from screens
      if (getStatus('chairs') !== 'none') {
        addItem('inst_reading_chair', 'chairs', 'armchair_rattan', dimensions.lengthCm - 95, dimensions.widthCm - 95, 315);
      }

      // Arc floor lamp providing soft diffuse illumination
      if (getStatus('lighting') !== 'none') {
        addItem('inst_study_lamp', 'lighting', 'lamp_arc_floor', dimensions.lengthCm - 60, dimensions.widthCm - 60, 0);
      }

      // Acoustic damping rug under workstation
      if (getStatus('rugs') !== 'none') {
        addItem('inst_study_rug', 'rugs', 'rug_jute_organic', Math.max(20, Math.floor((dimensions.lengthCm - 180) / 2)), 50, 0);
      }

      if (getStatus('decor_plants') !== 'none') {
        addItem('inst_study_plant', 'decor_plants', 'plant_monstera_pedestal', 30, 30, 0);
      }
    } else {
      // LAYOUT C: Maximum storage, file organization, vertical bookshelf + credenza sideboard
      if (getStatus('desks') !== 'none') {
        const deskId = 'desk_wfh_ergonomic';
        addItem('inst_study_desk', 'desks', deskId, 35, 30, 0);

        if (getStatus('chairs') !== 'none') {
          addItem('inst_study_chair', 'chairs', 'chair_ergonomic_mesh', 70, 95, 180);
        }
      }

      // STORAGE UNIT 1: Full-height archival bookshelf
      if (getStatus('bookshelves') !== 'none') {
        addItem('inst_study_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 35, 270);
      }

      // STORAGE UNIT 2: Rattan Credenza for printers, paper, tech accessories & books
      if (getStatus('storage') !== 'none') {
        addItem('inst_study_credenza', 'storage', 'credenza_rattan_sideboard', 35, Math.max(35, dimensions.widthCm - 85), 0);
      }

      // Additional secondary storage shelf if room length allows
      if (dimensions.lengthCm > 350) {
        addItem('inst_study_shelf_2', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, Math.max(40, dimensions.widthCm - 120), 270);
      }

      if (getStatus('rugs') !== 'none') {
        addItem('inst_study_rug', 'rugs', 'rug_jute_organic', 35, 35, 0);
      }

      if (getStatus('lighting') !== 'none') {
        addItem('inst_study_lamp', 'lighting', 'lamp_ceramic_table', dimensions.lengthCm - 55, 35, 0);
      }
    }
  }

  // =========================================================================
  // ROOM TYPE: Dining Room
  // =========================================================================
  else if (roomType === 'dining_room') {
    if (variation === 'space_efficient') {
      // Aligned along one wall to preserve open walking passage
      if (getStatus('tables') !== 'none') {
        addItem('inst_dining_table', 'tables', 'table_coffee_marble', 40, Math.max(30, Math.floor((dimensions.widthCm - 90) / 2)), 0);
        if (getStatus('chairs') !== 'none') {
          addItem('inst_chair_1', 'chairs', 'chair_wishbone_dining', 60, Math.max(20, Math.floor((dimensions.widthCm - 90) / 2) - 45), 0);
          addItem('inst_chair_2', 'chairs', 'chair_wishbone_dining', 130, Math.max(20, Math.floor((dimensions.widthCm - 90) / 2) - 45), 0);
        }
      }
      if (getStatus('rugs') !== 'none') {
        addItem('inst_dining_rug', 'rugs', 'rug_geo_terracotta', 30, Math.max(20, Math.floor((dimensions.widthCm - 140) / 2)), 0);
      }
    } else if (variation === 'comfort_focused') {
      // Centered with generous 90cm pullout clearance on all sides
      if (getStatus('tables') !== 'none') {
        const tX = Math.max(40, Math.floor((dimensions.lengthCm - 160) / 2));
        const tY = Math.max(40, Math.floor((dimensions.widthCm - 90) / 2));
        addItem('inst_dining_table', 'tables', 'table_coffee_marble', tX, tY, 0);

        if (getStatus('chairs') !== 'none') {
          addItem('inst_chair_1', 'chairs', 'chair_wishbone_dining', tX + 20, tY - 50, 0);
          addItem('inst_chair_2', 'chairs', 'chair_wishbone_dining', tX + 90, tY - 50, 0);
          addItem('inst_chair_3', 'chairs', 'chair_wishbone_dining', tX + 20, tY + 95, 180);
          addItem('inst_chair_4', 'chairs', 'chair_wishbone_dining', tX + 90, tY + 95, 180);
        }
      }
      if (getStatus('lighting') !== 'none') {
        addItem('inst_dining_light', 'lighting', 'lamp_ceramic_table', 35, 35, 0);
      }
      if (getStatus('rugs') !== 'none') {
        addItem('inst_dining_rug', 'rugs', 'rug_geo_terracotta', Math.max(20, Math.floor((dimensions.lengthCm - 200) / 2)), Math.max(20, Math.floor((dimensions.widthCm - 140) / 2)), 0);
      }
    } else {
      // Storage focused: dining table with full buffet credenza & display cabinet
      const tX = Math.max(40, Math.floor((dimensions.lengthCm - 160) / 2));
      const tY = Math.max(40, Math.floor((dimensions.widthCm - 90) / 2));
      if (getStatus('tables') !== 'none') {
        addItem('inst_dining_table', 'tables', 'table_coffee_marble', tX, tY, 0);
      }
      if (getStatus('storage') !== 'none') {
        addItem('inst_dining_buffet', 'storage', 'credenza_rattan_sideboard', 30, Math.max(30, dimensions.widthCm - 75), 0);
      }
      if (getStatus('bookshelves') !== 'none') {
        addItem('inst_dining_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 30, 270);
      }
      if (getStatus('rugs') !== 'none') {
        addItem('inst_dining_rug', 'rugs', 'rug_geo_terracotta', Math.max(20, Math.floor((dimensions.lengthCm - 200) / 2)), Math.max(20, Math.floor((dimensions.widthCm - 140) / 2)), 0);
      }
    }
  }

  // =========================================================================
  // ROOM TYPE: Studio Apartment / Other
  // =========================================================================
  else {
    if (variation === 'space_efficient') {
      if (getStatus('beds') !== 'none') addItem('inst_studio_bed', 'beds', 'bed_single_studio', 30, 25, 0);
      if (getStatus('desks') !== 'none') addItem('inst_studio_desk', 'desks', 'desk_student_compact', dimensions.lengthCm - 130, 30, 0);
      if (getStatus('chairs') !== 'none') addItem('inst_studio_chair', 'chairs', 'chair_task_budget', dimensions.lengthCm - 100, 95, 180);
      if (getStatus('rugs') !== 'none') addItem('inst_studio_rug', 'rugs', 'rug_jute_organic', 30, 30, 0);
    } else if (variation === 'comfort_focused') {
      if (getStatus('beds') !== 'none') addItem('inst_studio_bed', 'beds', 'bed_single_studio', 30, 25, 0);
      if (getStatus('sofas') !== 'none') addItem('inst_studio_sofa', 'sofas', 'sofa_scandi_2s', dimensions.lengthCm - 170, 30, 0);
      if (getStatus('tables') !== 'none') addItem('inst_studio_table', 'tables', 'table_coffee_nesting', dimensions.lengthCm - 150, 120, 0);
      if (getStatus('rugs') !== 'none') addItem('inst_studio_rug', 'rugs', 'rug_geo_terracotta', dimensions.lengthCm - 180, 50, 0);
    } else {
      if (getStatus('beds') !== 'none') addItem('inst_studio_bed', 'beds', 'bed_single_studio', 30, 25, 0);
      if (getStatus('wardrobes') !== 'none') addItem('inst_studio_ward', 'wardrobes', 'wardrobe_2door_sliding', 30, dimensions.widthCm - 160, 0);
      if (getStatus('bookshelves') !== 'none') addItem('inst_studio_shelf', 'bookshelves', 'bookshelf_arch', dimensions.lengthCm - 85, 30, 270);
      if (getStatus('storage') !== 'none') addItem('inst_studio_credenza', 'storage', 'credenza_rattan_sideboard', dimensions.lengthCm - 160, dimensions.widthCm - 80, 0);
    }
  }

  return items;
}

/**
 * Generates 3 customized layout alternatives for the room.
 */
export function generateLayoutAlternatives(
  data: QuestionnaireData & {
    designPriorities?: any;
    safetyRequirements?: any;
    ownedFurniture?: any[];
  },
  existingItems?: PlacedItem[]
): Record<string, LayoutAlternative> {
  const { budget, roomType } = data;
  const isBudgetSensitive = (budget?.totalBudgetINR || 125000) < 75000 || data.designPriorities?.primary === 'budget_conscious';

  // Generate 3 variations integrating existing items
  const itemsA = buildRoomItems(data, 'space_efficient', isBudgetSensitive, existingItems);
  const itemsB = buildRoomItems(data, 'comfort_focused', false, existingItems);
  const itemsC = buildRoomItems(data, 'storage_focused', isBudgetSensitive, existingItems);

  const attachMetadata = (
    id: string,
    name: string,
    tagline: string,
    description: string,
    tradeOffs: string,
    items: PlacedItem[],
    rationalePoints: string[]
  ): LayoutAlternative => {
    // Only calculate cost for selected purchases (not owned, not unselected suggestions)
    const purchaseCost = items.reduce((sum, item) => {
      if (!item.isOwned && !item.isSuggested) {
        const cat = getCatalogItemById(item.itemId);
        return sum + (cat ? cat.priceINR * (item.quantity || 1) : 0);
      }
      return sum;
    }, 0);

    const safetyAudit = [
      'Primary circulation clearance: Minimum 75cm maintained throughout door and transit axes.',
    ];
    if (data.safetyRequirements?.wideClearances) {
      safetyAudit.push('Accessible transit corridors enlarged to 90cm+ for mobility comfort.');
    }

    return {
      id,
      name,
      tagline,
      description,
      tradeOffs,
      items,
      rationalePoints,
      estimatedCostINR: purchaseCost,
      safetyAudit,
    };
  };

  const roomLabel = roomType.charAt(0).toUpperCase() + roomType.slice(1).replace('_', ' ');

  return {
    space_efficient: attachMetadata(
      'space_efficient',
      `Layout A: Space-Efficient ${roomLabel}`,
      'Maximized circulation & open floor area',
      'Anchor pieces are strategically positioned against perimeter walls to maintain wide walking paths and preserve airy room flow.',
      'Leaves central walking zone unencumbered for effortless daily movement.',
      itemsA,
      [
        'Arranges pieces along perimeter boundaries to preserve clear passage to doors and windows.',
        'Maintains at least 85cm of unobstructed entryway clearance.',
        'Respects requested functional furniture while avoiding arbitrary clutter.',
      ]
    ),
    comfort_focused: attachMetadata(
      'comfort_focused',
      `Layout B: Comfort & Sanctuary ${roomLabel}`,
      'Relaxed ergonomics & balanced harmony',
      'Arranged around comfort, ergonomics, and acoustic softness with tailored positioning.',
      'Focuses on relaxed interaction, daylight orientation, and ergonomic seating.',
      itemsB,
      [
        'Positions work or lounging surfaces near natural daylight.',
        'Symmetric perimeter alignment creates a balanced, harmonious atmosphere.',
        'Preserves strict door and circulation clearances throughout.',
      ]
    ),
    storage_focused: attachMetadata(
      'storage_focused',
      `Layout C: Productivity & Storage ${roomLabel}`,
      'Maximized vertical storage & functional efficiency',
      'Optimized for organization, dedicated tasks, and multi-functional capability.',
      'Maximizes utility and dedicated work or storage capacity.',
      itemsC,
      [
        'Prioritizes efficient task flow and organized shelving access.',
        'Safely locates tall vertical storage against load-bearing perimeter walls.',
        'Prevents window occlusion while keeping daily tools in easy reach.',
      ]
    ),
  };
}
