/**
 * DecorHub Project & LocalStorage Persistence Manager
 */

import { Project, QuestionnaireData, RoomType, FurnitureCategory, FurnitureRequirement, PlacedItem } from '../types';
import { generateLayoutAlternatives } from './layoutGenerator';

const STORAGE_KEY_PROJECTS = 'decorhub_saved_projects_v1';
const STORAGE_KEY_ACTIVE_ID = 'decorhub_active_project_id_v1';
const STORAGE_KEY_DRAFT_SURVEY = 'decorhub_questionnaire_draft_v1';

/**
 * Returns room-type-appropriate furniture needs.
 * A study room receives ONLY office/study furniture; a bedroom receives ONLY bedroom furniture.
 */
export function getDefaultFurnitureNeedsForRoomType(
  roomType: RoomType
): Record<FurnitureCategory, FurnitureRequirement> {
  switch (roomType) {
    case 'study_room':
    case 'home_office':
      return {
        desks: 'required',
        chairs: 'required',
        bookshelves: 'optional',
        lighting: 'optional',
        storage: 'optional',
        rugs: 'none',
        decor_plants: 'none',
        beds: 'none',
        sofas: 'none',
        wardrobes: 'none',
        tables: 'none',
        tv_units: 'none',
      };
    case 'living_room':
      return {
        sofas: 'required',
        tables: 'required',
        tv_units: 'optional',
        chairs: 'optional',
        bookshelves: 'none',
        storage: 'optional',
        lighting: 'optional',
        rugs: 'optional',
        decor_plants: 'none',
        beds: 'none',
        desks: 'none',
        wardrobes: 'none',
      };
    case 'dining_room':
      return {
        tables: 'required',
        chairs: 'required',
        storage: 'optional',
        lighting: 'optional',
        rugs: 'none',
        decor_plants: 'none',
        beds: 'none',
        sofas: 'none',
        wardrobes: 'none',
        tv_units: 'none',
        desks: 'none',
        bookshelves: 'none',
      };
    case 'bedroom':
    case 'guest_room':
    default:
      return {
        beds: 'required',
        tables: 'required',
        wardrobes: 'required',
        chairs: 'none',
        desks: 'none',
        storage: 'optional',
        bookshelves: 'none',
        tv_units: 'none',
        lighting: 'optional',
        rugs: 'optional',
        decor_plants: 'none',
        sofas: 'none',
      };
  }
}

export const DEFAULT_INITIAL_QUESTIONNAIRE: QuestionnaireData = {
  userProfile: {
    ageGroup: '26-35',
    profession: 'Working Professional / Tech & Creative',
    roomUsers: 'Couple',
    occupantCount: 2,
    dailyActivities: ['sleeping', 'relaxing', 'reading', 'remote_work'],
    futureNeeds: 'Planning to add more book storage and modular tech accessories.',
  },
  roomType: 'bedroom',
  dimensions: {
    lengthCm: 420,
    widthCm: 350,
    ceilingHeightCm: 290,
    unit: 'cm',
    door: {
      wall: 'south',
      positionCm: 40,
      widthCm: 90,
      swing: 'inward-right',
    },
    windows: [
      {
        id: 'win_1',
        wall: 'east',
        positionCm: 80,
        widthCm: 140,
        heightCm: 150,
      },
    ],
    obstructions: [],
  },
  photoUrl: undefined,
  photoName: undefined,
  style: {
    primaryStyle: 'Japandi',
    secondaryStyle: 'Modern',
    preferredColors: ['Warm Terracotta', 'Sand Beige', 'Soft Olive', 'Natural Oak'],
    avoidColors: ['Neon Pink', 'Harsh Red'],
    preferredMaterials: ['Solid Oak', 'Woven Cane / Rattan', 'Natural Linen', 'Travertine'],
    atmosphere: 'Serene, light-filled, grounded and calm with tactile natural textures',
    lightingPreference: 'Warm ambient indirect (2700K) with focused task reading lights',
    spacePhilosophy: 'balanced',
  },
  functionalNeeds: {
    furnitureNeeds: getDefaultFurnitureNeedsForRoomType('bedroom'),
    extraStorage: true,
    dedicatedWorkArea: true,
    compactLayoutPriority: false,
    childFriendly: false,
    accessibleMovement: true,
    petFriendly: true,
    hobbySpace: false,
  },
  budget: {
    totalBudgetINR: 125000,
    coverageScope: 'full_turnkey',
    includesFurniture: true,
    includesDecor: true,
    includesLighting: true,
    includesDelivery: true,
    includesInstallation: true,
    includesRenovation: false,
    deliveryEstimateINR: 3500,
    installationEstimateINR: 4500,
    strictness: 'flexible',
    selectionDrivers: ['best_value', 'quality_durability', 'comfort_ergonomics'],
    furnishingPace: 'entire_room',
  },
};

/**
 * Creates a brand new Project from questionnaire answers
 */
export function createProjectFromQuestionnaire(
  data: QuestionnaireData,
  customName?: string,
  existingItems?: PlacedItem[],
  scanAnalysis?: any
): Project {
  const layouts = generateLayoutAlternatives(data, existingItems);
  const activeLayoutKey = 'space_efficient';
  const initialItems = [...(layouts[activeLayoutKey]?.items || existingItems || [])];

  const now = new Date().toISOString();
  const title =
    customName ||
    `${data.style.primaryStyle} ${
      data.roomType.charAt(0).toUpperCase() + data.roomType.slice(1).replace('_', ' ')
    }`;

  const project: Project = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: title,
    createdAt: now,
    updatedAt: now,
    questionnaire: data,
    activeLayoutId: activeLayoutKey,
    layoutAlternatives: layouts,
    currentPlacedItems: initialItems,
    scanAnalysis,
    originalExistingLayoutItems: existingItems,
    notes: 'Personalized layout generated with DecorHub adaptive interior design engine.',
  };

  return project;
}

/**
 * Loads all saved projects from localStorage
 */
export function loadAllProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) {
      // Seed initial sample project
      const seed = createProjectFromQuestionnaire(DEFAULT_INITIAL_QUESTIONNAIRE, 'Japandi Sanctuary Bedroom');
      saveProject(seed);
      return [seed];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = createProjectFromQuestionnaire(DEFAULT_INITIAL_QUESTIONNAIRE, 'Japandi Sanctuary Bedroom');
      saveProject(seed);
      return [seed];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse saved projects', err);
    return [];
  }
}

/**
 * Saves or updates a project in localStorage with quota-overflow recovery
 */
export function saveProject(project: Project): void {
  try {
    const projects = loadAllProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    project.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.unshift(project);
    }

    // Keep active project ID synced
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, project.id);

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (quotaErr) {
      console.warn('LocalStorage quota reached, pruning older projects while preserving active project:', quotaErr);
      // Prune list to keep at most 2 most recent projects, keeping active project intact
      const pruned = [project, ...projects.filter((p) => p.id !== project.id).slice(0, 1)];
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(pruned));
      } catch (err2) {
        // Last resort: save just the active project
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify([project]));
      }
    }
  } catch (err) {
    console.error('Failed to save project', err);
  }
}

/**
 * Gets currently active project or first available
 */
export function getActiveProject(): Project {
  const projects = loadAllProjects();
  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  if (activeId) {
    const found = projects.find((p) => p.id === activeId);
    if (found) return found;
  }
  return projects[0];
}

/**
 * Sets active project ID
 */
export function setActiveProjectId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
}

/**
 * Delete a project
 */
export function deleteProject(id: string): Project[] {
  const projects = loadAllProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  if (localStorage.getItem(STORAGE_KEY_ACTIVE_ID) === id && projects.length > 0) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, projects[0].id);
  }
  return projects;
}

/**
 * Duplicate a project
 */
export function duplicateProject(id: string): Project | null {
  const projects = loadAllProjects();
  const target = projects.find((p) => p.id === id);
  if (!target) return null;

  const duplicated: Project = {
    ...JSON.parse(JSON.stringify(target)),
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: `${target.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProject(duplicated);
  return duplicated;
}

/**
 * Draft questionnaire persistence
 */
export function saveQuestionnaireDraft(data: QuestionnaireData): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT_SURVEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save survey draft', e);
  }
}

export function loadQuestionnaireDraft(): QuestionnaireData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT_SURVEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_INITIAL_QUESTIONNAIRE,
        ...parsed,
        userProfile: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.userProfile,
          ...(parsed.userProfile || {}),
        },
        dimensions: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.dimensions,
          ...(parsed.dimensions || {}),
        },
        style: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.style,
          ...(parsed.style || {}),
        },
        functionalNeeds: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.functionalNeeds,
          ...(parsed.functionalNeeds || {}),
          furnitureNeeds: {
            ...DEFAULT_INITIAL_QUESTIONNAIRE.functionalNeeds.furnitureNeeds,
            ...(parsed.functionalNeeds?.furnitureNeeds || {}),
          },
        },
        budget: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.budget,
          ...(parsed.budget || {}),
        },
      };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_INITIAL_QUESTIONNAIRE;
}
