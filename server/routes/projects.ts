import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { Project } from '../../src/types';

export const projectsRouter = Router();

// In-memory fallback for guest/offline projects
const guestProjects = new Map<string, Project>();

// Helper to seed a default sample project into guest store if empty
const ensureDefaultGuestProject = () => {
  if (guestProjects.size === 0) {
    // will be populated from client or initial creation
  }
};

// GET /api/projects - list user's projects
projectsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest';

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    try {
      const { data, error } = await supabase
        .from('design_projects')
        .select('*')
        .eq('profile_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Map database records to Project type
        const projects: Project[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          questionnaire: d.questionnaire_data,
          activeLayoutId: d.active_layout_id,
          layoutAlternatives: d.questionnaire_data?.layoutAlternatives || {},
          currentPlacedItems: d.questionnaire_data?.currentPlacedItems || [],
          notes: d.notes,
        }));

        res.json({ source: 'database', projects });
        return;
      }
    } catch (err) {
      // Fallback
    }
  }

  // Return guest projects
  const list = Array.from(guestProjects.values());
  res.json({ source: 'in_memory_guest', projects: list });
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id || 'guest';

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('design_projects')
      .select('*')
      .eq('id', id)
      .eq('profile_id', userId)
      .single();

    if (!error && data) {
      const project: Project = {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        questionnaire: data.questionnaire_data,
        activeLayoutId: data.active_layout_id,
        layoutAlternatives: data.questionnaire_data?.layoutAlternatives || {},
        currentPlacedItems: data.questionnaire_data?.currentPlacedItems || [],
        notes: data.notes,
      };
      res.json({ project });
      return;
    }
  }

  const found = guestProjects.get(id);
  if (!found) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ project: found });
});

// POST /api/projects - create project
projectsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const projectPayload = req.body as Project;
  const userId = req.user?.id || 'guest';

  if (!projectPayload || !projectPayload.name) {
    res.status(400).json({ error: 'Project payload with name is required' });
    return;
  }

  const now = new Date().toISOString();
  const projectId = projectPayload.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const fullProject: Project = {
    ...projectPayload,
    id: projectId,
    createdAt: projectPayload.createdAt || now,
    updatedAt: now,
  };

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    try {
      const { data, error } = await supabase
        .from('design_projects')
        .upsert({
          id: projectId.includes('-') && projectId.length === 36 ? projectId : undefined,
          profile_id: userId,
          name: fullProject.name,
          active_layout_id: fullProject.activeLayoutId,
          notes: fullProject.notes,
          questionnaire_data: {
            ...fullProject.questionnaire,
            layoutAlternatives: fullProject.layoutAlternatives,
            currentPlacedItems: fullProject.currentPlacedItems,
          },
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        fullProject.id = data.id;
        res.status(201).json({ project: fullProject, savedToDatabase: true });
        return;
      }
    } catch (err) {
      // Fallback
    }
  }

  guestProjects.set(fullProject.id, fullProject);
  res.status(201).json({ project: fullProject, savedToDatabase: false });
});

// PUT /api/projects/:id - update project
projectsRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const projectPayload = req.body as Partial<Project>;
  const userId = req.user?.id || 'guest';
  const now = new Date().toISOString();

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    try {
      const { data, error } = await supabase
        .from('design_projects')
        .update({
          name: projectPayload.name,
          active_layout_id: projectPayload.activeLayoutId,
          notes: projectPayload.notes,
          questionnaire_data: {
            ...projectPayload.questionnaire,
            layoutAlternatives: projectPayload.layoutAlternatives,
            currentPlacedItems: projectPayload.currentPlacedItems,
          },
          updated_at: now,
        })
        .eq('id', id)
        .eq('profile_id', userId)
        .select()
        .single();

      if (!error && data) {
        res.json({ message: 'Project updated in database', id });
        return;
      }
    } catch (e) {
      // Fallback
    }
  }

  const existing = guestProjects.get(id);
  if (existing) {
    const updated: Project = {
      ...existing,
      ...projectPayload,
      id,
      updatedAt: now,
    };
    guestProjects.set(id, updated);
    res.json({ project: updated });
    return;
  }

  // If not found in memory, insert it
  const created: Project = {
    id,
    name: projectPayload.name || 'Untitled Room Design',
    createdAt: now,
    updatedAt: now,
    questionnaire: projectPayload.questionnaire as any,
    activeLayoutId: projectPayload.activeLayoutId || 'space_efficient',
    layoutAlternatives: projectPayload.layoutAlternatives || {},
    currentPlacedItems: projectPayload.currentPlacedItems || [],
  };
  guestProjects.set(id, created);
  res.json({ project: created });
});

// POST /api/projects/:id/duplicate - duplicate project
projectsRouter.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id || 'guest';
  const now = new Date().toISOString();

  let original: Project | undefined = guestProjects.get(id);

  if (!original && !req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data } = await supabase
      .from('design_projects')
      .select('*')
      .eq('id', id)
      .eq('profile_id', userId)
      .single();

    if (data) {
      original = {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        questionnaire: data.questionnaire_data,
        activeLayoutId: data.active_layout_id,
        layoutAlternatives: data.questionnaire_data?.layoutAlternatives || {},
        currentPlacedItems: data.questionnaire_data?.currentPlacedItems || [],
      };
    }
  }

  if (!original) {
    res.status(404).json({ error: 'Original project not found' });
    return;
  }

  const duplicated: Project = {
    ...JSON.parse(JSON.stringify(original)),
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };

  guestProjects.set(duplicated.id, duplicated);
  res.status(201).json({ project: duplicated });
});

// DELETE /api/projects/:id - delete project
projectsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id || 'guest';

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    await supabase.from('design_projects').delete().eq('id', id).eq('profile_id', userId);
  }

  guestProjects.delete(id);
  res.json({ message: 'Project deleted successfully' });
});
