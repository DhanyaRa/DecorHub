import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';

export const roomsRouter = Router();

const RoomSchema = z.object({
  roomType: z.string().min(1),
  lengthCm: z.number().positive().max(2500),
  widthCm: z.number().positive().max(2500),
  ceilingHeightCm: z.number().positive().optional(),
  unit: z.enum(['cm', 'metres', 'feet']).default('cm'),
  door: z.object({
    wall: z.enum(['north', 'south', 'east', 'west']),
    positionCm: z.number().nonnegative(),
    widthCm: z.number().positive(),
    swing: z.enum(['inward-left', 'inward-right', 'outward-left', 'outward-right']),
  }),
  windows: z.array(
    z.object({
      id: z.string(),
      wall: z.enum(['north', 'south', 'east', 'west']),
      positionCm: z.number().nonnegative(),
      widthCm: z.number().positive(),
      heightCm: z.number().positive().optional(),
    })
  ).default([]),
  obstructions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      xCm: z.number(),
      yCm: z.number(),
      widthCm: z.number().positive(),
      depthCm: z.number().positive(),
    })
  ).default([]),
  photoUrl: z.string().optional(),
});

// In-memory fallback storage for guest sessions
const guestRooms = new Map<string, any>();

// GET /api/rooms - list user rooms
roomsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest';

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('profile_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      res.json({ rooms: data });
      return;
    }
  }

  // Return guest rooms
  const rooms = Array.from(guestRooms.values()).filter((r) => r.profile_id === userId);
  res.json({ rooms });
});

// POST /api/rooms - create a new room
roomsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = RoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid room dimensions or configuration', details: parsed.error.format() });
    return;
  }

  const userId = req.user?.id || 'guest';
  const roomData = parsed.data;

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        profile_id: userId,
        room_type: roomData.roomType,
        length_cm: roomData.lengthCm,
        width_cm: roomData.widthCm,
        ceiling_height_cm: roomData.ceilingHeightCm,
        unit: roomData.unit,
        door_config: roomData.door,
        windows_config: roomData.windows,
        obstructions: roomData.obstructions,
        photo_url: roomData.photoUrl,
      })
      .select()
      .single();

    if (!error && data) {
      res.status(201).json({ room: data });
      return;
    }
  }

  // Guest fallback
  const newRoom = {
    id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    profile_id: userId,
    room_type: roomData.roomType,
    length_cm: roomData.lengthCm,
    width_cm: roomData.widthCm,
    ceiling_height_cm: roomData.ceilingHeightCm,
    unit: roomData.unit,
    door_config: roomData.door,
    windows_config: roomData.windows,
    obstructions: roomData.obstructions,
    photo_url: roomData.photoUrl,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  guestRooms.set(newRoom.id, newRoom);
  res.status(201).json({ room: newRoom });
});

// GET /api/rooms/:id
roomsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .eq('profile_id', userId)
      .single();

    if (!error && data) {
      res.json({ room: data });
      return;
    }
  }

  const room = guestRooms.get(id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  res.json({ room });
});

// PUT /api/rooms/:id
roomsRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = RoomSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid room update payload', details: parsed.error.format() });
    return;
  }

  const userId = req.user?.id;
  const data = parsed.data;

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data: updated, error } = await supabase
      .from('rooms')
      .update({
        room_type: data.roomType,
        length_cm: data.lengthCm,
        width_cm: data.widthCm,
        ceiling_height_cm: data.ceilingHeightCm,
        unit: data.unit,
        door_config: data.door,
        windows_config: data.windows,
        obstructions: data.obstructions,
        photo_url: data.photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('profile_id', userId)
      .select()
      .single();

    if (!error && updated) {
      res.json({ room: updated });
      return;
    }
  }

  const existing = guestRooms.get(id);
  if (!existing) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const updatedRoom = {
    ...existing,
    ...data,
    updated_at: new Date().toISOString(),
  };
  guestRooms.set(id, updatedRoom);
  res.json({ room: updatedRoom });
});

// DELETE /api/rooms/:id
roomsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!req.user?.isGuest && isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    await supabase.from('rooms').delete().eq('id', id).eq('profile_id', userId);
  }

  guestRooms.delete(id);
  res.json({ message: 'Room deleted successfully' });
});
