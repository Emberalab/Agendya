import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateInternalUserInput,
  UpdateInternalUserRoleInput,
  UpdateInternalUserStatusInput,
} from '@agendya/types';
import {
  createInternalUser,
  listInternalUsers,
  updateInternalUserRole,
  updateInternalUserStatus,
} from '../api';

const QUERY_KEY = ['backoffice', 'internal-users'] as const;

export function useInternalUsers() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: listInternalUsers });
}

export function useCreateInternalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInternalUserInput) => createInternalUser(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateInternalUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInternalUserRoleInput }) =>
      updateInternalUserRole(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateInternalUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInternalUserStatusInput }) =>
      updateInternalUserStatus(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
