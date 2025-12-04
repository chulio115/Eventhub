import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { AppRole } from '../auth/AuthContext';

export interface UserRow {
  id: string;
  external_id: string;
  email: string;
  name: string | null;
  role: AppRole;
  created_at: string;
}

export function useUsers() {
  return useQuery<UserRow[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, external_id, email, name, role, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });
}
