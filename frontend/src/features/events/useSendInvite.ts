import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface SendInviteParams {
  to: string[];
  event: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    city: string | null;
    organizer: string | null;
    event_url: string | null;
  };
  senderName: string;
}

export function useSendInvite() {
  return useMutation({
    mutationFn: async ({ to, event, senderName }: SendInviteParams) => {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { to, event, appUrl, senderName },
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim Senden');
      }

      if (!data.success) {
        throw new Error(data.error || 'E-Mail konnte nicht gesendet werden');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Einladung gesendet!');
    },
    onError: (error: Error) => {
      console.error('Send invite error:', error);
      toast.error(`E-Mail-Fehler: ${error.message}`);
    },
  });
}
