import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateLayoutAlternatives } from '../../src/utils/layoutGenerator';
import { QuestionnaireData } from '../../src/types';

export const recommendationsRouter = Router();

const RecommendationRequestSchema = z.object({
  userProfile: z.object({
    ageGroup: z.string(),
    profession: z.string(),
    roomUsers: z.string(),
    occupantCount: z.number().positive(),
    dailyActivities: z.array(z.string()),
    futureNeeds: z.string().optional().default(''),
  }),
  roomType: z.string(),
  dimensions: z.object({
    lengthCm: z.number().positive(),
    widthCm: z.number().positive(),
    ceilingHeightCm: z.number().positive().optional(),
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
  style: z.object({
    primaryStyle: z.string(),
    secondaryStyle: z.string().optional(),
    preferredColors: z.array(z.string()).default([]),
    avoidColors: z.array(z.string()).default([]),
    preferredMaterials: z.array(z.string()).default([]),
    atmosphere: z.string().optional().default(''),
    lightingPreference: z.string().optional().default(''),
    spacePhilosophy: z.enum(['clutter-free', 'balanced', 'decorative']).default('balanced'),
  }),
  functionalNeeds: z.object({
    furnitureNeeds: z.record(z.string(), z.string()).default({}),
    extraStorage: z.boolean().default(false),
    dedicatedWorkArea: z.boolean().default(false),
    compactLayoutPriority: z.boolean().default(false),
    childFriendly: z.boolean().default(false),
    accessibleMovement: z.boolean().default(false),
    petFriendly: z.boolean().default(false),
    hobbySpace: z.boolean().default(false),
  }),
  budget: z
    .object({
      totalBudgetINR: z.number().positive(),
      coverageScope: z.string().optional(),
      customCoverage: z.array(z.string()).optional(),
      includesFurniture: z.boolean().default(true),
      includesDecor: z.boolean().default(true),
      includesLighting: z.boolean().optional(),
      includesDelivery: z.boolean().default(false),
      includesInstallation: z.boolean().default(false),
      includesRenovation: z.boolean().optional(),
      deliveryEstimateINR: z.number().default(3500),
      installationEstimateINR: z.number().default(4500),
      renovationEstimateINR: z.number().optional(),
      strictness: z.string().optional(),
      selectionDrivers: z.array(z.string()).optional(),
      furnishingPace: z.string().optional(),
    })
    .passthrough(),
  photoUrl: z.string().optional(),
  photoName: z.string().optional(),
  completedAt: z.string().optional(),
}).passthrough();

// POST /api/recommendations - generate tailored layout alternatives and rationale
recommendationsRouter.post('/', (req: Request, res: Response): void => {
  const parsed = RecommendationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid recommendation inputs', details: parsed.error.format() });
    return;
  }

  const questionnaireData = parsed.data as QuestionnaireData;
  const layoutAlternatives = generateLayoutAlternatives(questionnaireData);

  res.json({
    success: true,
    engine: 'DecorHub Rule-Based Adaptive Synthesis Engine v1',
    roomType: questionnaireData.roomType,
    primaryStyle: questionnaireData.style.primaryStyle,
    layoutAlternatives,
    meta: {
      generatedAt: new Date().toISOString(),
      dimensionsCm: {
        length: questionnaireData.dimensions.lengthCm,
        width: questionnaireData.dimensions.widthCm,
      },
    },
  });
});
