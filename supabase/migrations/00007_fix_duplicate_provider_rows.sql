-- Migration 00007: Deactivate duplicate legacy seed provider rows and add partial unique index

-- 1. Deactivate old seed rows that have null base_url and null api_key_encrypted
UPDATE public.api_provider_settings
SET is_active = false, is_default = false
WHERE id NOT IN ('prov-setting-chat', 'prov-setting-image')
  AND (base_url IS NULL AND api_key_encrypted IS NULL);

-- 2. Create partial unique index ensuring at most ONE active provider per purpose
DROP INDEX IF EXISTS one_active_provider_per_purpose;
CREATE UNIQUE INDEX one_active_provider_per_purpose 
  ON public.api_provider_settings (purpose) 
  WHERE is_active = true;
