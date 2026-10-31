/**
 * DecorHub: Types & Data Models
 */

export type RoomType =
  | 'bedroom'
  | 'living_room'
  | 'study_room'
  | 'home_office'
  | 'guest_room'
  | 'dining_room'
  | 'studio_apartment'
  | 'other';

export type DimensionUnit = 'cm' | 'metres' | 'feet';

export type WallSide = 'north' | 'south' | 'east' | 'west';

export type DoorSwing = 'inward-left' | 'inward-right' | 'outward-left' | 'outward-right';

export interface DoorOpening {
  wall: WallSide;
  positionCm: number; // offset from wall start
  widthCm: number;
  swing: DoorSwing;
}

export interface WindowOpening {
  id: string;
  wall: WallSide;
  positionCm: number; // offset from wall start
  widthCm: number;
  heightCm?: number;
}

export interface RoomObstruction {
  id: string;
  label: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
}

export interface RoomDimensions {
  lengthCm: number; // Real-world length (x-axis)
  widthCm: number;  // Real-world width (y-axis)
  ceilingHeightCm?: number;
  unit: DimensionUnit;
  door: DoorOpening;
  windows: WindowOpening[];
  obstructions: RoomObstruction[];
  measurementSource?: 'user_confirmed' | 'estimated' | 'pending';
}

export type DesignStyle =
  | 'Modern'
  | 'Minimalist'
  | 'Scandinavian'
  | 'Japandi'
  | 'Contemporary Indian'
  | 'Bohemian'
  | 'Industrial'
  | 'Traditional'
  | 'Modern luxury'
  | 'Coastal'
  | 'Organic modern'
  | 'Eclectic';

export type FurnitureCategory =
  | 'beds'
  | 'sofas'
  | 'desks'
  | 'chairs'
  | 'wardrobes'
  | 'storage'
  | 'bookshelves'
  | 'tables'
  | 'tv_units'
  | 'lighting'
  | 'rugs'
  | 'decor_plants';

export type FurnitureRequirement = 'required' | 'optional' | 'owned' | 'none';

export type PriceTier = 'budget' | 'mid' | 'premium';

export type TopDownShapeType =
  | 'bed_double'
  | 'bed_single'
  | 'sofa_3seater'
  | 'sofa_2seater'
  | 'armchair'
  | 'desk_study'
  | 'desk_executive'
  | 'chair_office'
  | 'chair_dining'
  | 'wardrobe_large'
  | 'wardrobe_compact'
  | 'bookshelf'
  | 'credenza_storage'
  | 'table_coffee'
  | 'table_dining'
  | 'table_side'
  | 'tv_unit'
  | 'lamp_floor'
  | 'rug_rectangular'
  | 'rug_circular'
  | 'plant_potted'
  | 'generic_rect';

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  topDownType: TopDownShapeType;
  dimensions: {
    widthCm: number; // x dimension in default 0deg orientation
    depthCm: number; // y dimension in default 0deg orientation
    heightCm?: number;
  };
  priceINR: number;
  priceTier: PriceTier;
  style: DesignStyle[];
  material: string;
  color: string;
  hexColor: string;
  description: string;
  isDecor?: boolean;
  alternativeItemIds?: string[]; // cheaper or different size alternatives
  imageUrl?: string;
  isVerified?: boolean; // verified listing vs illustrative recommendation
  purchaseUrl?: string; // verified purchase link when available
  retailerName?: string;
}

export interface PlacedItem {
  instanceId: string;
  itemId: string;
  xCm: number; // Top-left corner in room coordinates
  yCm: number;
  rotationDeg: number; // 0, 90, 180, 270 or arbitrary
  isOwned?: boolean; // Collection A: Existing furniture owned by user
  isSuggested?: boolean; // Collection C: Optional AI recommendation, not yet selected for purchase
  status?: 'selected' | 'owned' | 'suggested' | 'purchased';
  customLabel?: string;
  customDimensions?: { widthCm: number; depthCm: number; heightCm?: number };
  ownedAction?: OwnedFurnitureAction;
  actionRationale?: string;
  quantity?: number;
}

export interface UserProfile {
  ageGroup: string;
  profession: string;
  roomUsers: string;
  occupantCount: number;
  dailyActivities: string[];
  futureNeeds: string;
}

export interface StylePreferences {
  primaryStyle: DesignStyle;
  secondaryStyle?: DesignStyle;
  preferredColors: string[];
  avoidColors: string[];
  preferredMaterials: string[];
  atmosphere: string;
  lightingPreference: string;
  spacePhilosophy: 'clutter-free' | 'balanced' | 'decorative';
}

export interface FunctionalNeeds {
  furnitureNeeds: Record<FurnitureCategory, FurnitureRequirement>;
  extraStorage: boolean;
  dedicatedWorkArea: boolean;
  compactLayoutPriority: boolean;
  childFriendly: boolean;
  accessibleMovement: boolean;
  petFriendly: boolean;
  hobbySpace: boolean;
}

export type BudgetStrictness = 'strict' | 'flexible' | 'quality_first';

export type BudgetCoverageScope =
  | 'furniture_only'
  | 'furniture_decor'
  | 'furniture_decor_lighting'
  | 'full_turnkey'
  | 'complete_renovation'
  | 'custom';

export type FurnitureValueDriver =
  | 'affordable'
  | 'best_value'
  | 'quality_durability'
  | 'comfort_ergonomics'
  | 'style_appearance'
  | 'storage_functionality'
  | 'child_safety'
  | 'sustainable';

export type FurnishingPace =
  | 'entire_room'
  | 'essential_first'
  | 'phased_plan';

export interface BudgetPreferences {
  totalBudgetINR: number;
  coverageScope: BudgetCoverageScope;
  customCoverage?: string[];
  includesFurniture: boolean;
  includesDecor: boolean;
  includesLighting?: boolean;
  includesDelivery: boolean;
  includesInstallation: boolean;
  includesRenovation?: boolean;
  deliveryEstimateINR: number;
  installationEstimateINR: number;
  renovationEstimateINR?: number;
  strictness: BudgetStrictness;
  selectionDrivers: FurnitureValueDriver[];
  furnishingPace: FurnishingPace;
}

export interface QuestionnaireData {
  userProfile: UserProfile;
  roomType: RoomType;
  dimensions: RoomDimensions;
  photoUrl?: string;
  photoName?: string;
  style: StylePreferences;
  functionalNeeds: FunctionalNeeds;
  budget: BudgetPreferences;
  completedAt?: string;
}

export type DesignPriority =
  | 'space_efficient'
  | 'comfort_focused'
  | 'productivity_focused'
  | 'study_focused'
  | 'storage_focused'
  | 'child_safe'
  | 'accessibility_focused'
  | 'minimalist'
  | 'budget_conscious'
  | 'balanced';

export interface DesignPrioritySettings {
  primary: DesignPriority;
  secondary?: DesignPriority[];
  weights?: Record<string, number>;
}

export interface SafetyRequirements {
  childFriendly: boolean;
  petFriendly: boolean;
  antiFallAnchoring: boolean;
  softCorners: boolean;
  wideClearances: boolean;
}

export type OwnedFurnitureAction = 'keep' | 'reposition' | 'rotate' | 'remove' | 'move' | 'replace' | 'exclude';

export interface OwnedFurnitureItem {
  id: string;
  category: FurnitureCategory;
  label: string;
  widthCm: number;
  depthCm: number;
  heightCm?: number;
  approxLocation?: string;
  condition?: 'excellent' | 'good' | 'fair';
  action: OwnedFurnitureAction;
  color?: string;
}

export interface DetectedElement {
  id: string;
  label: string;
  category: FurnitureCategory;
  confidence: number;
  box?: { x: number; y: number; width: number; height: number }; // normalized 0..1 bounding box
  estimatedDimensionsCm?: { width: number; depth: number; height?: number };
  dimensionConfidence?: 'confirmed' | 'estimated' | 'unknown';
  approximateWall?: WallSide | 'center';
  isExistingOwned: boolean;
  suggestedAction?: OwnedFurnitureAction;
  actionRationale?: string;
  isConfirmed?: boolean;
}

export interface RoomScanAnalysis {
  detectedRoomType: RoomType;
  architecturalFeatures: string[];
  detectedElements: DetectedElement[];
  detectedStyle: DesignStyle;
  detectedColors: string[];
  detectedMaterials: string[];
  lightingCondition: string;
  movementSafetyConcerns: string[];
  estimatedRoomDimensions: {
    lengthCm: number;
    widthCm: number;
    ceilingHeightCm?: number;
    confidence: 'confirmed' | 'estimated' | 'unknown';
  };
  aiProvider: 'gemini-3.8-flash' | 'manual-input';
  rawNotes?: string;
}

export interface LayoutAlternative {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tradeOffs: string;
  items: PlacedItem[];
  rationalePoints: string[];
  estimatedCostINR?: number;
  safetyAudit?: string[];
}

export interface ValidationIssue {
  id: string;
  type: 'collision' | 'out_of_bounds' | 'door_obstruction' | 'window_obstruction' | 'clearance_tight';
  severity: 'error' | 'warning';
  message: string;
  involvedInstanceIds: string[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  questionnaire: QuestionnaireData;
  activeLayoutId: string;
  layoutAlternatives: Record<string, LayoutAlternative>;
  currentPlacedItems: PlacedItem[]; // The active, editable layout
  notes?: string;
  scanAnalysis?: RoomScanAnalysis;
  originalExistingLayoutItems?: PlacedItem[]; // Detected existing layout in 2D
  designPriorities?: DesignPrioritySettings;
  safetyRequirements?: SafetyRequirements;
  ownedFurniture?: OwnedFurnitureItem[];
}

export type ActiveTab =
  | 'home'
  | 'my_designs'
  | 'scanner'
  | 'questionnaire'
  | 'planner'
  | 'catalog'
  | 'budget'
  | 'projects'
  | 'settings';
