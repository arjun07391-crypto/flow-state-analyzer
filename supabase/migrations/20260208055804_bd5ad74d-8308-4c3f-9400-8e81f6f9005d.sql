-- Create function for updating timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for tracking detected app distractions
CREATE TABLE public.app_distractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  package_name TEXT NOT NULL,
  app_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_work_related BOOLEAN,
  user_responded BOOLEAN DEFAULT false,
  current_activity_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user's app categorization preferences
CREATE TABLE public.app_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_name TEXT NOT NULL UNIQUE,
  app_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'distraction',
  is_work_app BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.app_distractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (no auth yet)
CREATE POLICY "Allow all operations on app_distractions" 
ON public.app_distractions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on app_categories" 
ON public.app_categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_app_distractions_started ON public.app_distractions(started_at);
CREATE INDEX idx_app_categories_package ON public.app_categories(package_name);

-- Insert some common distraction apps as defaults
INSERT INTO public.app_categories (package_name, app_name, category, is_work_app) VALUES
  ('com.whatsapp', 'WhatsApp', 'social', false),
  ('com.instagram.android', 'Instagram', 'social', false),
  ('com.facebook.katana', 'Facebook', 'social', false),
  ('com.twitter.android', 'Twitter/X', 'social', false),
  ('com.discord', 'Discord', 'social', false),
  ('com.snapchat.android', 'Snapchat', 'social', false),
  ('com.zhiliaoapp.musically', 'TikTok', 'entertainment', false),
  ('com.google.android.youtube', 'YouTube', 'entertainment', false),
  ('com.netflix.mediaclient', 'Netflix', 'entertainment', false),
  ('com.spotify.music', 'Spotify', 'entertainment', false),
  ('com.reddit.frontpage', 'Reddit', 'social', false)
ON CONFLICT (package_name) DO NOTHING;

-- Create trigger for updating updated_at on app_categories
CREATE TRIGGER update_app_categories_updated_at
BEFORE UPDATE ON public.app_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();