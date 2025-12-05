import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface UploadArgs {
  eventId: string;
  file: File;
}

interface UploadResult {
  publicUrl: string;
  path: string;
}

// Maximale Dateigröße: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Erlaubte Dateitypen
const ALLOWED_TYPES = ['application/pdf'];

export function useUploadEventFile() {
  return useMutation<UploadResult, Error, UploadArgs>({
    mutationFn: async ({ eventId, file }) => {
      // Validierung: Dateityp
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Nur PDF-Dateien sind erlaubt');
      }

      // Validierung: Dateigröße
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(`Datei ist zu groß (${sizeMB} MB). Maximum: 10 MB`);
      }

      const bucket = 'event-documents';
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `${eventId}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '31536000', // 1 Jahr Cache
        upsert: false,
        contentType: 'application/pdf',
      });

      if (error) {
        // Bessere Fehlermeldungen
        if (error.message.includes('duplicate')) {
          throw new Error('Diese Datei existiert bereits');
        }
        if (error.message.includes('size')) {
          throw new Error('Datei ist zu groß für den Upload');
        }
        throw new Error(`Upload fehlgeschlagen: ${error.message}`);
      }

      // Signed URL generieren (1 Jahr gültig) - funktioniert auch bei nicht-public Buckets
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 365 Tage

      if (signedError || !signedData?.signedUrl) {
        // Fallback auf public URL
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        return {
          publicUrl: publicData.publicUrl,
          path,
        };
      }

      return {
        publicUrl: signedData.signedUrl,
        path,
      };
    },
    onSuccess: () => {
      toast.success('PDF erfolgreich hochgeladen');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
