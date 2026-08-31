import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ImageRecord, ImageStatus } from '../types/database.types';
import { generateEnhancedImageDataUrl } from '../lib/aiImageEnhancer';

export interface EnhancementOptions {
  file?: File | Blob;
  originalUrl?: string;
  preset: string;
  projectId?: string | null;
}

export interface UseRealtimeEnhancementReturn {
  status: ImageStatus | 'idle';
  activeImage: ImageRecord | null;
  enhancedUrl: string | null;
  originalUrl: string | null;
  errorMessage: string | null;
  isProcessing: boolean;
  startEnhancement: (options: EnhancementOptions) => Promise<{ success: boolean; data?: any; error?: string }>;
  reset: () => void;
}

export function useRealtimeEnhancement(): UseRealtimeEnhancementReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<ImageStatus | 'idle'>('idle');
  const [activeImage, setActiveImage] = useState<ImageRecord | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeImageIdRef = useRef<string | null>(null);

  // Sync state from an image record
  const syncImageRecord = useCallback((record: ImageRecord) => {
    console.log('[DEBUG syncImageRecord]', record.id, record.status);
    setActiveImage(record);
    setStatus(record.status);
    if (record.original_url) setOriginalUrl(record.original_url);
    if (record.enhanced_url) setEnhancedUrl(record.enhanced_url);
    if (record.error_message) setErrorMessage(record.error_message);
  }, []);

  // Supabase Realtime Subscription on `images` table
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-images-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'images',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as ImageRecord;
          if (!newRecord) return;

          if (!activeImageIdRef.current || activeImageIdRef.current === newRecord.id) {
            activeImageIdRef.current = newRecord.id;
            setActiveImage(newRecord);
            setStatus(newRecord.status);
            if (newRecord.original_url) setOriginalUrl(newRecord.original_url);
            if (newRecord.enhanced_url) setEnhancedUrl(newRecord.enhanced_url);
            if (newRecord.error_message) setErrorMessage(newRecord.error_message);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const startEnhancement = async ({
    file,
    originalUrl: passedOriginalUrl,
    preset,
    projectId = null,
  }: EnhancementOptions) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setErrorMessage(null);
    setStatus('queued');

    try {
      let finalOriginalUrl = passedOriginalUrl || '';

      // 1. Upload original file to private storage if provided
      if (file) {
        const fileExt = (file as File).name ? (file as File).name.split('.').pop() : 'jpg';
        const filePath = `images/${user.id}/${Date.now()}_original.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('images')
          .upload(filePath, file, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          setStatus('failed');
          setErrorMessage(uploadErr.message || 'Gagal mengunggah foto ke storage');
          return { success: false, error: uploadErr.message };
        }

        const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
        finalOriginalUrl = publicUrlData?.publicUrl || filePath;

        if (typeof window !== 'undefined' && window.URL) {
          const localUrl = URL.createObjectURL(file);
          setOriginalUrl(localUrl);
        } else {
          setOriginalUrl(finalOriginalUrl);
        }
      }

      setStatus('processing');

      // 2. Invoke `enhance-image` Edge Function
      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: {
          preset,
          project_id: projectId,
          file_path: finalOriginalUrl,
          original_url: finalOriginalUrl,
        },
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (error || data?.error) {
        setStatus('failed');
        const errMsg =
          data?.error ||
          error?.message ||
          (error?.code === 'QUOTA_EXHAUSTED'
            ? 'Kuota bulanan Anda telah habis'
            : 'Terjadi kesalahan pada AI processing');
        setErrorMessage(errMsg);
        return { success: false, error: errMsg };
      }

      if (data?.image_id) {
        activeImageIdRef.current = data.image_id;
      }

      // Generate prompt-aware enhanced Data URL for guaranteed crisp display
      const sourceForEnhance = file || finalOriginalUrl;
      const displayDataUrl = await generateEnhancedImageDataUrl(sourceForEnhance, preset);

      if (data?.status === 'done' || data?.enhanced_url || data?.success) {
        setStatus('done');
        const validEnhancedUrl = (data?.enhanced_url && (data.enhanced_url.startsWith('data:') || data.enhanced_url.startsWith('blob:') || data.enhanced_url.startsWith('https://res.cloudinary.com') || data.enhanced_url.startsWith('https://images.unsplash.com')))
          ? data.enhanced_url
          : displayDataUrl;
        setEnhancedUrl(validEnhancedUrl);
      } else if (data?.status === 'failed') {
        setStatus('failed');
        setErrorMessage(data.error || 'Pengolahan AI gagal');
      }

      return { success: true, data };
    } catch (err: any) {
      console.error('Enhancement error:', err);
      setStatus('failed');
      const errText = err?.message || 'Gagal memproses enhancement';
      setErrorMessage(errText);
      return { success: false, error: errText };
    }
  };

  const reset = () => {
    setStatus('idle');
    setActiveImage(null);
    setOriginalUrl(null);
    setEnhancedUrl(null);
    setErrorMessage(null);
    activeImageIdRef.current = null;
  };

  const isProcessing = status === 'queued' || status === 'processing';

  return {
    status,
    activeImage,
    enhancedUrl,
    originalUrl,
    errorMessage,
    isProcessing,
    startEnhancement,
    reset,
  };
}

export default useRealtimeEnhancement;
