import { Router, Request, Response } from 'express';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { FURNITURE_CATALOG } from '../../src/data/furnitureCatalog';

export const furnitureRouter = Router();

// GET /api/furniture - list and filter items
furnitureRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const {
    category,
    style,
    tier,
    search,
    minPrice,
    maxPrice,
    maxWidth,
    maxDepth,
    sort,
  } = req.query;

  // If Supabase is configured, try querying database
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    try {
      let query = supabase.from('furniture_products').select('*');

      if (category && category !== 'all') {
        query = query.eq('category', category as string);
      }
      if (tier && tier !== 'all') {
        query = query.eq('price_tier', tier as string);
      }
      if (style && style !== 'all') {
        query = query.contains('styles', [style as string]);
      }
      if (minPrice) {
        query = query.gte('price_inr', Number(minPrice));
      }
      if (maxPrice) {
        query = query.lte('price_inr', Number(maxPrice));
      }
      if (maxWidth) {
        query = query.lte('width_cm', Number(maxWidth));
      }
      if (maxDepth) {
        query = query.lte('depth_cm', Number(maxDepth));
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (sort === 'price_desc') {
        query = query.order('price_inr', { ascending: false });
      } else if (sort === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('price_inr', { ascending: true });
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Map database records to standard shape
        const items = data.map((d: any) => ({
          id: d.slug,
          name: d.name,
          category: d.category,
          topDownType: d.top_down_type,
          dimensions: {
            widthCm: Number(d.width_cm),
            depthCm: Number(d.depth_cm),
            heightCm: d.height_cm ? Number(d.height_cm) : undefined,
          },
          priceINR: Number(d.price_inr),
          priceTier: d.price_tier,
          style: d.styles,
          material: d.material,
          color: d.color,
          hexColor: d.hex_color,
          description: d.description,
          isDecor: Boolean(d.is_decor),
          isEstimate: true,
          alternativeItemIds: d.alternative_item_slugs || [],
        }));

        res.json({
          source: 'database',
          count: items.length,
          items,
        });
        return;
      }
    } catch (err) {
      // Fallback to built-in seed catalog
    }
  }

  // Built-in catalog filtering
  let items = [...FURNITURE_CATALOG];

  if (category && category !== 'all') {
    items = items.filter((i) => i.category === category);
  }
  if (tier && tier !== 'all') {
    items = items.filter((i) => i.priceTier === tier);
  }
  if (style && style !== 'all') {
    items = items.filter((i) => i.style.includes(style as any));
  }
  if (minPrice) {
    items = items.filter((i) => i.priceINR >= Number(minPrice));
  }
  if (maxPrice) {
    items = items.filter((i) => i.priceINR <= Number(maxPrice));
  }
  if (maxWidth) {
    items = items.filter((i) => i.dimensions.widthCm <= Number(maxWidth));
  }
  if (maxDepth) {
    items = items.filter((i) => i.dimensions.depthCm <= Number(maxDepth));
  }
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.material.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }

  if (sort === 'price_desc') {
    items.sort((a, b) => b.priceINR - a.priceINR);
  } else if (sort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'size') {
    items.sort((a, b) => b.dimensions.widthCm * b.dimensions.depthCm - a.dimensions.widthCm * a.dimensions.depthCm);
  } else {
    items.sort((a, b) => a.priceINR - b.priceINR);
  }

  res.json({
    source: isSupabaseConfigured() ? 'database_fallback' : 'in_memory_catalog',
    count: items.length,
    items: items.map((i) => ({ ...i, isEstimate: true })),
  });
});

// GET /api/furniture/:id
furnitureRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    try {
      const { data, error } = await supabase
        .from('furniture_products')
        .select('*')
        .or(`slug.eq.${id},id.eq.${id}`)
        .single();

      if (!error && data) {
        res.json({
          item: {
            id: data.slug,
            name: data.name,
            category: data.category,
            topDownType: data.top_down_type,
            dimensions: {
              widthCm: Number(data.width_cm),
              depthCm: Number(data.depth_cm),
              heightCm: data.height_cm ? Number(data.height_cm) : undefined,
            },
            priceINR: Number(data.price_inr),
            priceTier: data.price_tier,
            style: data.styles,
            material: data.material,
            color: data.color,
            hexColor: data.hex_color,
            description: data.description,
            isDecor: Boolean(data.is_decor),
            isEstimate: true,
            alternativeItemIds: data.alternative_item_slugs || [],
          },
        });
        return;
      }
    } catch (e) {
      // Fallback to in-memory
    }
  }

  const found = FURNITURE_CATALOG.find((i) => i.id === id);
  if (!found) {
    res.status(404).json({ error: 'Furniture item not found' });
    return;
  }

  res.json({ item: { ...found, isEstimate: true } });
});
