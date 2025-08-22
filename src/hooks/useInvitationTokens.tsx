import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InvitationToken {
  id: string;
  token: string;
  email?: string;
  expires_at: string;
  max_uses?: number;
  current_uses?: number;
  is_active: boolean;
  used_at?: string;
  used_by?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateTokenData {
  email?: string;
  expires_at?: string;
  max_uses?: number;
}

export const useInvitationTokens = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all tokens for the current user
  const {
    data: tokens = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invitation-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InvitationToken[];
    },
  });

  // Create new token
  const createTokenMutation = useMutation({
    mutationFn: async (tokenData: CreateTokenData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invitation_tokens')
        .insert({
          ...tokenData,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-tokens'] });
      toast({
        title: 'Token created',
        description: 'New invitation token has been generated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deactivate token
  const deactivateTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('invitation_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-tokens'] });
      toast({
        title: 'Token deactivated',
        description: 'Invitation token has been deactivated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to deactivate token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update token
  const updateTokenMutation = useMutation({
    mutationFn: async ({ 
      tokenId, 
      updates 
    }: { 
      tokenId: string; 
      updates: Partial<Pick<InvitationToken, 'email' | 'expires_at' | 'max_uses' | 'is_active'>>
    }) => {
      const { error } = await supabase
        .from('invitation_tokens')
        .update(updates)
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-tokens'] });
      toast({
        title: 'Token updated',
        description: 'Invitation token has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tokens,
    isLoading,
    error,
    createToken: createTokenMutation.mutate,
    isCreating: createTokenMutation.isPending,
    deactivateToken: deactivateTokenMutation.mutate,
    isDeactivating: deactivateTokenMutation.isPending,
    updateToken: updateTokenMutation.mutate,
    isUpdating: updateTokenMutation.isPending,
  };
};