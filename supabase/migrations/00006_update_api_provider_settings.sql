-- Migration: Update api_provider_settings to support function scopes (chat vs image_generation)

ALTER TABLE public.api_provider_settings 
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'image_generation',
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Drop unique constraint on provider_name if it exists to allow per-purpose rows
ALTER TABLE public.api_provider_settings DROP CONSTRAINT IF EXISTS api_provider_settings_provider_name_key;

-- Add composite unique constraint for purpose and provider_name
ALTER TABLE public.api_provider_settings ADD CONSTRAINT api_provider_settings_purpose_provider_key UNIQUE (purpose, provider_name);
