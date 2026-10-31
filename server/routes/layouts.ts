import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRoomLayout } from '../../src/utils/collision';
import { generateLayoutAlternatives } from '../../src/utils/layoutGenerator';
import { PlacedItem, RoomDimensions, QuestionnaireData } from '../../src/types';

export const layoutsRouter = Router();

const ValidateLayoutSchema = z.object({
  items: z.array(
    z.object({
      instanceId: z.string(),
      itemId: z.string(),
      xCm: z.number(),
      yCm: z.number(),
      rotationDeg: z.number(),
      isOwned: z.boolean().optional(),
      quantity: z.number().optional(),
    })
  ),
  room: z.object({
    lengthCm: z.number().positive(),
    widthCm: z.number().positive(),
    ceilingHeightCm: z.number().optional(),
    unit: z.enum(['cm', 'metres', 'feet']).default('cm'),
    door: z.object({
      wall: z.enum(['north', 'south', 'east', 'west']),
      positionCm: z.number().nonnegative(),
      widthCm: z.number().positive(),
      swing: z.enum(['inward-left', 'inward-right', 'outward-left', 'outward-right']),
    }),
    windows: z.array(z.any()).default([]),
    obstructions: z.array(z.any()).default([]),
  }),
});

// POST /api/layouts/validate - Server-side geometry validation
layoutsRouter.post('/validate', (req: Request, res: Response): void => {
  const parsed = ValidateLayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid layout validation payload', details: parsed.error.format() });
    return;
  }

  const { items, room } = parsed.data;
  const issues = validateRoomLayout(items as PlacedItem[], room as RoomDimensions);

  res.json({
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    hasWarnings: issues.length > 0,
    issueCount: issues.length,
    issues,
  });
});

// POST /api/layouts/generate
layoutsRouter.post('/generate', (req: Request, res: Response): void => {
  try {
    const alternatives = generateLayoutAlternatives(req.body as QuestionnaireData);
    res.json({ alternatives });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate layout' });
  }
});
