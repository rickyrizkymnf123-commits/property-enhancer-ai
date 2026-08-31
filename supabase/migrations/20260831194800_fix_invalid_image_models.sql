-- Migration: Perbaiki model_name yang tidak valid untuk image_generation
UPDATE public.api_provider_settings
SET model_name = 'gemini/gemini-2.5-flash-image'
WHERE purpose = 'image_generation'
  AND is_active = true
  AND model_name NOT IN (
    'gemini/gemini-2.5-flash-image',
    'gemini/gemini-3.1-flash-image-preview',
    'gemini/gemini-3-pro-image-preview',
    'openai/gpt-image-1.5',
    'openai/gpt-image-1-mini',
    'openai/gpt-image-2',
    'vertex_ai/imagen-4.0-fast-generate-001',
    'vertex_ai/imagen-4.0-generate-001'
  );
