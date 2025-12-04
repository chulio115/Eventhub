import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

interface UploadArgs {
  eventId: string;
  file: File;
}

interface UploadResult {
  publicUrl: string;
  path: string;
}

export function useUploadEventFile() {
  return useMutation<UploadResult, Error, UploadArgs>({
    mutationFn: async ({ eventId, file }) => {
      const bucket = 'event-documents';
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `${eventId}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        throw error as Error;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);

      return {
        publicUrl: data.publicUrl,
        path,
      };
    },
  });
}
