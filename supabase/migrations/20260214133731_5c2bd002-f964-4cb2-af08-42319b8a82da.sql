
-- Add whitelist support to app_categories
ALTER TABLE public.app_categories ADD COLUMN is_whitelisted boolean DEFAULT false;

-- Add reason, AI recommendation, and severity to app_distractions
ALTER TABLE public.app_distractions ADD COLUMN reason text;
ALTER TABLE public.app_distractions ADD COLUMN ai_recommendation text;
ALTER TABLE public.app_distractions ADD COLUMN severity text DEFAULT 'normal';
