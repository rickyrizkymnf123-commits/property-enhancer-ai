-- Migration 00008: Encryption & Decryption RPC functions for API Keys

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT encode(
    pgp_sym_encrypt(plain_key, coalesce(nullif(current_setting('app.settings.encryption_key', true), ''), 'pea_default_secure_vault_key_2026')),
    'base64'
  );
$$;

CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN encrypted_key IS NULL OR encrypted_key = '' THEN ''
    WHEN encrypted_key LIKE 'enc_v1_%' THEN
      pgp_sym_decrypt(
        decode(substring(encrypted_key from 8), 'base64'),
        coalesce(nullif(current_setting('app.settings.encryption_key', true), ''), 'pea_default_secure_vault_key_2026')
      )
    WHEN encrypted_key LIKE 'sk-%' OR encrypted_key LIKE 'AIza%' THEN encrypted_key
    ELSE
      pgp_sym_decrypt(
        decode(encrypted_key, 'base64'),
        coalesce(nullif(current_setting('app.settings.encryption_key', true), ''), 'pea_default_secure_vault_key_2026')
      )
  END;
$$;
