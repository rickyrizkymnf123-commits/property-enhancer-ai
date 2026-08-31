import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ImageRecord, ImageStatus } from '../types/database.types';

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
    if (record.status === 'failed') {
      setEnhancedUrl(null);
    } else if (record.enhanced_url) {
      setEnhancedUrl(record.enhanced_url);
    }
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
            if (newRecord.status === 'failed') {
              setEnhancedUrl(null);
            } else if (newRecord.enhanced_url) {
              setEnhancedUrl(newRecord.enhanced_url);
            }
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
    setEnhancedUrl(null);
    setStatus('queued');

    try {
      let imageBase64DataUrl = '';

      // 1. Read file as Base64 Data URL if provided
      if (file) {
        if (typeof window !== 'undefined' && window.FileReader) {
          imageBase64DataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file as Blob);
          });
        }
        if (typeof window !== 'undefined' && window.URL) {
          const localUrl = URL.createObjectURL(file as Blob);
          setOriginalUrl(localUrl);
        }
      }

      if (!imageBase64DataUrl && passedOriginalUrl) {
        imageBase64DataUrl = passedOriginalUrl;
        setOriginalUrl(passedOriginalUrl);
      }

      const finalOriginalUrl = passedOriginalUrl || imageBase64DataUrl || '';

      setStatus('processing');

      // 2. Invoke `enhance-image` Edge Function with single-path payload
      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: {
          image_base64: imageBase64DataUrl,
          prompt: preset,
          preset: preset,
          project_id: projectId,
          file_path: finalOriginalUrl,
          original_url: finalOriginalUrl,
        },
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (error || data?.error || data?.success === false) {
        setStatus('failed');
        setEnhancedUrl(null);
        const errMsg = data?.error || error?.message || 'Terjadi kesalahan pada AI processing';
        setErrorMessage(errMsg);
        return { success: false, error: errMsg };
      }

      if (data?.image_id) {
        activeImageIdRef.current = data.image_id;
      }

      const returnedEnhancedUrl = data?.enhanced_url || data?.enhancedUrl;

      if (returnedEnhancedUrl) {
        setStatus('done');
        setEnhancedUrl(returnedEnhancedUrl);
      } else {
        // JANGAN PERNAH fallback ke canvas/simulasi apapun.
        // Kalau server bilang sukses tapi tidak ada enhanced_url, itu BUG di server — tampilkan sebagai error.
        setStatus('failed');
        setEnhancedUrl(null);
        const errMsg = 'Server melaporkan sukses tapi tidak mengembalikan enhanced_url. Ini bug di edge function, laporkan ke admin.';
        setErrorMessage(errMsg);
        return { success: false, error: errMsg };
      }

      return { success: true, data };
    } catch (err: any) {
      console.error('Enhancement error:', err);
      setStatus('failed');
      setEnhancedUrl(null);
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
