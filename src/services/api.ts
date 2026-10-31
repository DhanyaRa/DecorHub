/**
 * DecorHub REST API Client
 * Seamlessly interfaces with the Express backend, with automatic fallback
 * to client-side localStorage/in-memory data if offline or unauthenticated.
 */

import {
  Project,
  QuestionnaireData,
  PlacedItem,
  RoomDimensions,
  BudgetPreferences,
  CatalogItem,
} from '../types';
import { supabase } from './supabaseClient';

const API_BASE = '/api';

/**
 * Get current session token if logged in
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      // Ignore
    }
  }

  // Pass guest user ID from localStorage if available
  let guestId = localStorage.getItem('decorhub_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    localStorage.setItem('decorhub_guest_id', guestId);
  }
  headers['x-guest-user-id'] = guestId;

  return headers;
}

/**
 * Check backend health & Supabase connection
 */
export async function checkBackendHealth(): Promise<{
  isOnline: boolean;
  supabaseConfigured: boolean;
  user?: any;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/health`, { headers });
    if (!res.ok) return { isOnline: false, supabaseConfigured: false };
    const data = await res.json();
    return {
      isOnline: true,
      supabaseConfigured: Boolean(data.supabaseConfigured),
      user: data.user,
    };
  } catch (err) {
    return { isOnline: false, supabaseConfigured: false };
  }
}

/**
 * Fetch furniture catalog from backend
 */
export async function fetchFurnitureCatalogApi(filters?: {
  category?: string;
  style?: string;
  tier?: string;
  search?: string;
  sort?: string;
}): Promise<CatalogItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.style) params.set('style', filters.style);
    if (filters?.tier) params.set('tier', filters.tier);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.sort) params.set('sort', filters.sort);

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/furniture?${params.toString()}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn('API furniture fetch failed, using local catalog', err);
  }

  // Fallback to local catalog
  const { FURNITURE_CATALOG } = await import('../data/furnitureCatalog');
  return FURNITURE_CATALOG;
}

/**
 * Validate layout coordinates & clearances on backend
 */
export async function validateLayoutApi(
  items: PlacedItem[],
  room: RoomDimensions
) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/layouts/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, room }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Fallback to local collision engine
  }

  const { validateRoomLayout } = await import('../utils/collision');
  const issues = validateRoomLayout(items, room);
  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    hasWarnings: issues.length > 0,
    issueCount: issues.length,
    issues,
  };
}

/**
 * Calculate budget on backend with trusted catalog prices
 */
export async function calculateBudgetApi(
  items: PlacedItem[],
  budget: BudgetPreferences
) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/budget/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, budget }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Fallback
  }

  const { calculateBudgetBreakdown } = await import('../utils/currency');
  const breakdown = calculateBudgetBreakdown(items, budget);
  return { breakdown, cheaperAlternatives: [] };
}

/**
 * Generate Layout Alternatives via backend service
 */
export async function generateRecommendationsApi(data: QuestionnaireData) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.layoutAlternatives) {
        return result.layoutAlternatives;
      }
    }
  } catch (err) {
    // Fallback to local rule engine
  }

  const { generateLayoutAlternatives } = await import('../utils/layoutGenerator');
  return generateLayoutAlternatives(data);
}

/**
 * Sync project to backend API
 */
export async function syncProjectToApi(project: Project): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(project),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    // Silent fail; project remains safely in localStorage
  }
}

/**
 * Delete project on backend API
 */
export async function deleteProjectFromApi(id: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers,
    });
  } catch (e) {
    // Ignore
  }
}
