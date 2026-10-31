/**
 * DecorHub Geometry & Dimension Conversion Utilities
 */

import { DimensionUnit, PlacedItem, RoomDimensions } from '../types';
import { getCatalogItemById } from '../data/furnitureCatalog';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert user entered dimensions to centimeters
 */
export function convertToCm(value: number, unit: DimensionUnit): number {
  if (unit === 'metres') return Math.round(value * 100);
  if (unit === 'feet') return Math.round(value * 30.48);
  return Math.round(value);
}

/**
 * Convert centimeters to display string in specified unit
 */
export function formatDimension(cm: number, unit: DimensionUnit = 'cm'): string {
  if (unit === 'metres') {
    return `${(cm / 100).toFixed(2)} m`;
  }
  if (unit === 'feet') {
    const feet = cm / 30.48;
    return `${feet.toFixed(1)} ft`;
  }
  return `${Math.round(cm)} cm`;
}

/**
 * Computes axis-aligned bounding box of a placed item taking its rotation into account.
 * (assuming orthogonal 0, 90, 180, 270 degrees or general rotation)
 */
export function getItemBoundingBox(item: PlacedItem): BoundingBox {
  const catalog = getCatalogItemById(item.itemId);
  const w = item.customDimensions?.widthCm || (catalog ? catalog.dimensions.widthCm : 60);
  const d = item.customDimensions?.depthCm || (catalog ? catalog.dimensions.depthCm : 60);

  const rotNorm = ((item.rotationDeg % 360) + 360) % 360;
  const isPerpendicular = rotNorm === 90 || rotNorm === 270;

  const effectiveWidth = isPerpendicular ? d : w;
  const effectiveHeight = isPerpendicular ? w : d;

  return {
    minX: item.xCm,
    minY: item.yCm,
    maxX: item.xCm + effectiveWidth,
    maxY: item.yCm + effectiveHeight,
    width: effectiveWidth,
    height: effectiveHeight,
  };
}

/**
 * Checks if two bounding boxes intersect with tolerance
 */
export function boxesOverlap(boxA: BoundingBox, boxB: BoundingBox, toleranceCm = 2): boolean {
  return !(
    boxA.maxX <= boxB.minX + toleranceCm ||
    boxA.minX >= boxB.maxX - toleranceCm ||
    boxA.maxY <= boxB.minY + toleranceCm ||
    boxA.minY >= boxB.maxY - toleranceCm
  );
}

/**
 * Check if a box is completely inside the room
 */
export function isBoxInsideRoom(box: BoundingBox, room: RoomDimensions, marginCm = 0): boolean {
  return (
    box.minX >= marginCm &&
    box.minY >= marginCm &&
    box.maxX <= room.lengthCm - marginCm &&
    box.maxY <= room.widthCm - marginCm
  );
}
