import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { AppRole } from '../auth/AuthContext';

interface UpdateUserRoleInput {
  id: string;
  role: AppRole;
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserRoleInput) => {
      const { data, error } = await supabase
        .from('users')
        .update({ role: input.role })
        .eq('id', input.id)
        .select('id, role')
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
