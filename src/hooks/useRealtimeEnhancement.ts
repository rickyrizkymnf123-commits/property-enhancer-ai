import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ImageRecord, ImageStatus } from '../types/database.types';
import { transformImageWithPrompt } from '../lib/aiImageTransformer';

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
    setActiveImage(record);
    setStatus(record.status);
    if (record.original_url) setOriginalUrl(record.original_url);
    if (record.enhanced_url) setEnhancedUrl(record.enhanced_url);
    if (record.error_message) setErrorMessage(record.error_message);
  }, []);

  // Supabase Realtime Subscription on `images` table
  useEffect(() => {
    if (!user) return;

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

          // If this update matches our current active image or if we are actively waiting
          if (activeImageIdRef.current && newRecord.id === activeImageIdRef.current) {
            syncImageRecord(newRecord);
          } else if (status === 'queued' || status === 'processing') {
            // Also accept if current active ID is not set yet but belongs to user
            activeImageIdRef.current = newRecord.id;
            syncImageRecord(newRecord);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, status, syncImageRecord]);

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
        
        // Use local object URL for instant crisp display
        if (typeof window !== 'undefined' && window.URL) {
          const localUrl = URL.createObjectURL(file);
          setOriginalUrl(localUrl);
        } else {
          setOriginalUrl(finalOriginalUrl);
        }
      }

      // 2. Transition to queued & processing status loop
      setStatus('queued');
      await new Promise((res) => setTimeout(res, 700));

      setStatus('processing');
      await new Promise((res) => setTimeout(res, 1200));

      // 3. Generate Real AI Visual Img2Img Transformation with prompt elements (Night, Fence, Canopy)
      let transformedDataUrl = '';
      try {
        transformedDataUrl = await transformImageWithPrompt({
          imageSource: file || finalOriginalUrl,
          prompt: preset,
        });
      } catch (transformErr) {
        console.warn('AI transformation warning:', transformErr);
      }

      // 4. Invoke `enhance-image` Edge Function & admin config check
      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: {
          preset,
          project_id: projectId,
          file_path: finalOriginalUrl,
          original_url: finalOriginalUrl,
          enhanced_data_url: transformedDataUrl,
        },
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (error) {
        setStatus('failed');
        const errMsg =
          error.message ||
          (error.code === 'QUOTA_EXHAUSTED'
            ? 'Kuota bulanan Anda telah habis'
            : 'Terjadi kesalahan pada AI processing');
        setErrorMessage(errMsg);
        return { success: false, error: errMsg };
      }

      if (data?.image_id) {
        activeImageIdRef.current = data.image_id;
      }

      await new Promise((res) => setTimeout(res, 800));

      const finalEnhancedUrl = transformedDataUrl || data?.enhanced_url;
      setStatus('done');
      if (finalEnhancedUrl) {
        setEnhancedUrl(finalEnhancedUrl);
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
