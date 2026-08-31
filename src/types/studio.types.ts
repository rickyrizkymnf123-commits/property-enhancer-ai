import type { ImageStatus } from './database.types';

export interface ImageRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  batch_id: string | null;
  original_url: string;
  enhanced_url: string | null;
  preset: string;
  status: ImageStatus;
  error_message: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  category: 'Universal' | 'Interior' | 'Eksterior' | 'Staging';
  icon: string;
  badge?: string;
}

export interface EnhancementJobPayload {
  file_path?: string;
  original_url?: string;
  preset: string;
  project_id?: string | null;
}
