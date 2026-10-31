-- DecorHub Supabase PostgreSQL Schema Migration
-- Creates profiles, rooms, furniture_products, design_projects, room_layouts, layout_items, and saved_furniture_selections

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  profession TEXT,
  age_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  length_cm NUMERIC NOT NULL CHECK (length_cm > 0),
  width_cm NUMERIC NOT NULL CHECK (width_cm > 0),
  ceiling_height_cm NUMERIC CHECK (ceiling_height_cm IS NULL OR ceiling_height_cm > 0),
  unit TEXT NOT NULL DEFAULT 'cm',
  door_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  windows_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  obstructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Furniture Products Table (Public Catalog)
CREATE TABLE IF NOT EXISTS public.furniture_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  top_down_type TEXT NOT NULL,
  width_cm NUMERIC NOT NULL CHECK (width_cm > 0),
  depth_cm NUMERIC NOT NULL CHECK (depth_cm > 0),
  height_cm NUMERIC,
  price_inr NUMERIC NOT NULL CHECK (price_inr >= 0),
  price_tier TEXT NOT NULL CHECK (price_tier IN ('budget', 'mid', 'premium')),
  styles TEXT[] NOT NULL DEFAULT '{}',
  material TEXT NOT NULL,
  color TEXT NOT NULL,
  hex_color TEXT NOT NULL,
  description TEXT NOT NULL,
  is_decor BOOLEAN DEFAULT false,
  is_estimate BOOLEAN DEFAULT true,
  alternative_item_slugs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Design Projects Table
CREATE TABLE IF NOT EXISTS public.design_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  questionnaire_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_layout_id TEXT NOT NULL DEFAULT 'space_efficient',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Room Layouts Table (Alternative arrangements per project)
CREATE TABLE IF NOT EXISTS public.room_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  trade_offs TEXT,
  rationale_points JSONB DEFAULT '[]'::jsonb,
  estimated_cost_inr NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, layout_key)
);

-- 6. Layout Items Table (Individual placed furniture pieces)
CREATE TABLE IF NOT EXISTS public.layout_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layout_id UUID NOT NULL REFERENCES public.room_layouts(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  x_cm NUMERIC NOT NULL,
  y_cm NUMERIC NOT NULL,
  rotation_deg NUMERIC NOT NULL DEFAULT 0,
  is_owned BOOLEAN DEFAULT false,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (layout_id, instance_id)
);

-- 7. Saved Furniture Selections Table
CREATE TABLE IF NOT EXISTS public.saved_furniture_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_owned BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_profile_id ON public.rooms(profile_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_profile_id ON public.design_projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_furniture_products_category ON public.furniture_products(category);
CREATE INDEX IF NOT EXISTS idx_furniture_products_price ON public.furniture_products(price_inr);
CREATE INDEX IF NOT EXISTS idx_room_layouts_project_id ON public.room_layouts(project_id);
CREATE INDEX IF NOT EXISTS idx_layout_items_layout_id ON public.layout_items(layout_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furniture_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_furniture_selections ENABLE ROW LEVEL SECURITY;

-- Furniture products: Public readable by everyone
CREATE POLICY "Furniture products are viewable by everyone" 
  ON public.furniture_products FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Users can manage own rooms" 
  ON public.rooms FOR ALL USING (auth.uid() = profile_id);

-- Design projects policies
CREATE POLICY "Users can manage own design projects" 
  ON public.design_projects FOR ALL USING (auth.uid() = profile_id);

-- Room layouts policies (via design_projects ownership)
CREATE POLICY "Users can manage layouts of own projects" 
  ON public.room_layouts FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.design_projects 
      WHERE design_projects.id = room_layouts.project_id 
      AND design_projects.profile_id = auth.uid()
    )
  );

-- Layout items policies (via room_layouts -> design_projects ownership)
CREATE POLICY "Users can manage layout items of own projects" 
  ON public.layout_items FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.room_layouts
      JOIN public.design_projects ON design_projects.id = room_layouts.project_id
      WHERE room_layouts.id = layout_items.layout_id 
      AND design_projects.profile_id = auth.uid()
    )
  );

-- Saved furniture selections policies
CREATE POLICY "Users can manage saved selections of own projects" 
  ON public.saved_furniture_selections FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.design_projects
      WHERE design_projects.id = saved_furniture_selections.project_id
      AND design_projects.profile_id = auth.uid()
    )
  );

-- Automatic Profile Creation Trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
