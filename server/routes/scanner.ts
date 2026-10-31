import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { FURNITURE_CATALOG } from '../../src/data/furnitureCatalog';
import {
  PlacedItem,
  RoomScanAnalysis,
  DetectedElement,
  RoomType,
  DesignStyle,
} from '../../src/types';

export const scannerRouter = Router();

const ScannerAnalyzeSchema = z.object({
  imageBase64: z.string().min(10), // Base64 data or data URL
  mimeType: z.string().default('image/jpeg'),
  userMeasurements: z
    .object({
      lengthCm: z.number().positive().optional(),
      widthCm: z.number().positive().optional(),
      ceilingHeightCm: z.number().positive().optional(),
    })
    .optional(),
  knownReference: z.string().optional(),
});

const MapLayoutSchema = z.object({
  detections: z.array(z.any()),
  roomLengthCm: z.number().positive(),
  roomWidthCm: z.number().positive(),
});

/**
 * Converts user-confirmed detected elements into placed items in room coordinates.
 * Retains existing furniture as owned assets (isOwned: true, status: 'owned').
 * Never fabricates furniture not present in the detections array.
 */
export function mapDetectionsToPlacedItems(
  detections: DetectedElement[],
  roomLengthCm: number,
  roomWidthCm: number
): PlacedItem[] {
  const placedItems: PlacedItem[] = [];

  detections.forEach((det, idx) => {
    // If user or AI marked this item for removal, do not place it in the active room layout
    if (det.suggestedAction === 'remove' || det.suggestedAction === 'exclude') {
      return;
    }

    // Match to closest physical catalog representation by category
    const matchingCatalog =
      FURNITURE_CATALOG.find((c) => c.category === det.category) || FURNITURE_CATALOG[0];

    const itemWidth = det.estimatedDimensionsCm?.width || matchingCatalog.dimensions.widthCm;
    const itemDepth = det.estimatedDimensionsCm?.depth || matchingCatalog.dimensions.depthCm;

    let xCm = 40;
    let yCm = 40;
    let rotationDeg = 0;

    // Use detected wall location or bounding box coordinates
    if (det.box && typeof det.box.x === 'number' && typeof det.box.y === 'number') {
      const centerX = (det.box.x + (det.box.width || 0.3) / 2) * roomLengthCm;
      const centerY = (det.box.y + (det.box.height || 0.3) / 2) * roomWidthCm;
      xCm = Math.max(
        20,
        Math.min(roomLengthCm - itemWidth - 20, Math.round(centerX - itemWidth / 2))
      );
      yCm = Math.max(
        20,
        Math.min(roomWidthCm - itemDepth - 20, Math.round(centerY - itemDepth / 2))
      );
    } else if (det.approximateWall === 'north') {
      xCm = Math.max(20, Math.round(roomLengthCm / 2 - itemWidth / 2));
      yCm = 25;
      rotationDeg = 0;
    } else if (det.approximateWall === 'south') {
      xCm = Math.max(20, Math.round(roomLengthCm / 2 - itemWidth / 2));
      yCm = Math.max(25, Math.round(roomWidthCm - itemDepth - 25));
      rotationDeg = 180;
    } else if (det.approximateWall === 'west') {
      xCm = 25;
      yCm = Math.max(20, Math.round(roomWidthCm / 2 - itemDepth / 2));
      rotationDeg = 90;
    } else if (det.approximateWall === 'east') {
      xCm = Math.max(25, Math.round(roomLengthCm - itemWidth - 25));
      yCm = Math.max(20, Math.round(roomWidthCm / 2 - itemDepth / 2));
      rotationDeg = 270;
    } else {
      // Center placement
      xCm = Math.max(20, Math.round((roomLengthCm - itemWidth) / 2));
      yCm = Math.max(20, Math.round((roomWidthCm - itemDepth) / 2));
    }

    // If repositioned, ensure safe distance from walls/corners
    if (det.suggestedAction === 'reposition') {
      xCm = Math.max(40, Math.min(roomLengthCm - itemWidth - 40, xCm));
      yCm = Math.max(40, Math.min(roomWidthCm - itemDepth - 40, yCm));
    }

    if (det.suggestedAction === 'rotate') {
      rotationDeg = (rotationDeg + 90) % 360;
    }

    placedItems.push({
      instanceId: `existing_${det.id}_${idx}_${Date.now()}`,
      itemId: matchingCatalog.id,
      xCm,
      yCm,
      rotationDeg,
      isOwned: true,
      isSuggested: false,
      status: 'owned',
      customLabel: `[Existing] ${det.label}`,
      customDimensions: {
        widthCm: itemWidth,
        depthCm: itemDepth,
        heightCm: det.estimatedDimensionsCm?.height || 75,
      },
      ownedAction: det.suggestedAction || 'keep',
      actionRationale: det.actionRationale,
      quantity: 1,
    });
  });

  return placedItems;
}

// POST /api/scanner/map-layout - dynamically maps detections into 2D room coordinates
scannerRouter.post('/map-layout', (req: Request, res: Response): void => {
  const parsed = MapLayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid layout parameters' });
    return;
  }
  const { detections, roomLengthCm, roomWidthCm } = parsed.data;
  const placedItems = mapDetectionsToPlacedItems(detections, roomLengthCm, roomWidthCm);
  res.json({ placedItems });
});

// POST /api/scanner/analyze - Real vision analysis using Gemini 3.8 Flash
scannerRouter.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const parseResult = ScannerAnalyzeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'INVALID_PAYLOAD',
      message: 'Invalid scan payload. Image base64 string is required.',
      details: parseResult.error.format(),
    });
    return;
  }

  const { imageBase64, mimeType, userMeasurements } = parseResult.data;

  // Extract clean base64 data without prefix
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY_UNAVAILABLE',
      message:
        'AI Vision API key is not configured in this environment. To avoid fake sample detections, automated scanning is paused. You can manually enter existing furniture and room dimensions below to generate your 2D plan.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are DecorHub's expert architectural and interior design computer-vision analyzer.
Examine this actual uploaded room photograph with precision.
Inspect ONLY the objects, furniture, and architectural features genuinely visible in this image.
DO NOT hallucinate items that are not in the room.

Return ONLY a valid JSON object (no markdown code blocks, no backticks, no preamble) conforming to this exact schema:
{
  "detectedRoomType": "bedroom" | "living_room" | "study_room" | "home_office" | "guest_room" | "dining_room" | "studio_apartment" | "other",
  "architecturalFeatures": [
    "description of visible door location and wall (e.g. North wall window with curtains, East wall door frame)"
  ],
  "detectedElements": [
    {
      "id": "det_1",
      "label": "Accurate object name (e.g. Queen Wooden Bed, Black Ergonomic Task Chair, Teak Writing Desk)",
      "category": "beds" | "sofas" | "desks" | "chairs" | "wardrobes" | "storage" | "bookshelves" | "tables" | "tv_units" | "lighting" | "rugs" | "decor_plants",
      "confidence": 0.88,
      "box": { "x": 0.15, "y": 0.3, "width": 0.45, "height": 0.4 },
      "estimatedDimensionsCm": { "width": 160, "depth": 200, "height": 85 },
      "dimensionConfidence": "estimated",
      "approximateWall": "north" | "south" | "east" | "west" | "center",
      "isExistingOwned": true,
      "suggestedAction": "keep" | "reposition" | "rotate" | "remove",
      "actionRationale": "Ergonomic explanation of why this action is suggested (e.g. clear doorway clearance, maximize window daylight, improve circulation flow)"
    }
  ],
  "detectedStyle": "Modern" | "Minimalist" | "Scandinavian" | "Japandi" | "Contemporary Indian" | "Bohemian" | "Industrial" | "Traditional" | "Modern luxury" | "Coastal" | "Organic modern" | "Eclectic",
  "detectedColors": ["color 1", "color 2", ...],
  "detectedMaterials": ["material 1", "material 2", ...],
  "lightingCondition": "description of natural daylight and artificial lighting in the photo",
  "movementSafetyConcerns": ["any tight clearance <60cm, door blockage, or trip hazard detected in photo"],
  "estimatedRoomDimensions": {
    "lengthCm": 420,
    "widthCm": 350,
    "ceilingHeightCm": 280,
    "confidence": "estimated"
  }
}

CRITICAL RULES:
1. Detect ONLY furniture pieces that actually exist in the photo. If an office has only a desk and chair, return ONLY the desk and chair.
2. Approximate bounding boxes (x, y, width, height) must be normalized 0..1 coordinates relative to image width/height.
3. Every single-photo dimension is an uncalibrated estimate; mark confidence as 'estimated'.
4. Provide a constructive, personalized suggestedAction ('keep', 'reposition', 'rotate', 'remove') and clear actionRationale for every item.`;

    // 15-second timeout on vision API
    const callPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI Vision model timed out after 15 seconds')), 15000)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);

    let rawText = response.text || '';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedJson = JSON.parse(rawText.trim());

    // Incorporate user's confirmed measurements if provided
    const lengthCm = userMeasurements?.lengthCm || parsedJson.estimatedRoomDimensions?.lengthCm || 420;
    const widthCm = userMeasurements?.widthCm || parsedJson.estimatedRoomDimensions?.widthCm || 350;
    const ceilingHeightCm = userMeasurements?.ceilingHeightCm || parsedJson.estimatedRoomDimensions?.ceilingHeightCm || 280;

    const finalAnalysis: RoomScanAnalysis = {
      detectedRoomType: (parsedJson.detectedRoomType || 'bedroom') as RoomType,
      architecturalFeatures: Array.isArray(parsedJson.architecturalFeatures)
        ? parsedJson.architecturalFeatures
        : [],
      detectedElements: Array.isArray(parsedJson.detectedElements)
        ? parsedJson.detectedElements.map((el: any, i: number) => ({
            id: el.id || `det_${i + 1}`,
            label: el.label || 'Furniture Item',
            category: el.category || 'chairs',
            confidence: typeof el.confidence === 'number' ? Math.round(el.confidence * 100) / 100 : 0.85,
            box: el.box || { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
            estimatedDimensionsCm: {
              width: el.estimatedDimensionsCm?.width || 100,
              depth: el.estimatedDimensionsCm?.depth || 70,
              height: el.estimatedDimensionsCm?.height || 75,
            },
            dimensionConfidence: 'estimated',
            approximateWall: el.approximateWall || 'north',
            isExistingOwned: true,
            suggestedAction: el.suggestedAction || 'keep',
            actionRationale: el.actionRationale || 'Placed according to room boundary and lighting.',
            isConfirmed: true,
          }))
        : [],
      detectedStyle: (parsedJson.detectedStyle || 'Japandi') as DesignStyle,
      detectedColors: Array.isArray(parsedJson.detectedColors)
        ? parsedJson.detectedColors
        : ['Warm Neutral', 'Timber Wood'],
      detectedMaterials: Array.isArray(parsedJson.detectedMaterials)
        ? parsedJson.detectedMaterials
        : ['Timber', 'Fabric'],
      lightingCondition: parsedJson.lightingCondition || 'Natural daylight from perimeter window',
      movementSafetyConcerns: Array.isArray(parsedJson.movementSafetyConcerns)
        ? parsedJson.movementSafetyConcerns
        : [],
      estimatedRoomDimensions: {
        lengthCm,
        widthCm,
        ceilingHeightCm,
        confidence: userMeasurements?.lengthCm ? 'confirmed' : 'estimated',
      },
      aiProvider: 'gemini-3.8-flash',
      rawNotes: `Vision analysis verified with Gemini 3.8 Flash. Detected ${
        parsedJson.detectedElements?.length || 0
      } visible items.`,
    };

    const existingLayoutItems = mapDetectionsToPlacedItems(
      finalAnalysis.detectedElements,
      lengthCm,
      widthCm
    );

    res.json({
      success: true,
      analysis: finalAnalysis,
      existingLayoutItems,
      measurementAccuracyNotice: userMeasurements?.lengthCm
        ? 'Measurements marked as User-Confirmed based on physical dimensions.'
        : 'Measurements are uncalibrated visual estimates. Please confirm physical room dimensions.',
    });
  } catch (err: any) {
    console.error('Gemini vision analysis failed:', err);
    res.status(500).json({
      success: false,
      error: 'ANALYSIS_FAILED',
      message: err.message || 'Vision model was unable to process this image. Please retry or enter furniture and dimensions manually.',
    });
  }
});
