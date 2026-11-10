"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassSlot } from "@/core/schedule";
import type { CourseRecord } from "@/core/types";
import { localRepository } from "./local-repository";
import { apiRepository } from "./api-repository";
import { isSupabaseConfigured } from "./supabase-client";
import type { CalculatorState, Profile, ShareLinkOptions } from "./repository";

/** Local preview remains available when backend environment variables are absent. */
export const repo = isSupabaseConfigured ? apiRepository : localRepository;

export const keys = {
  user: ["user"] as const,
  profile: ["profile"] as const,
  records: ["records"] as const,
  calculator: (code: string) => ["calculator", code] as const,
  lastCalc: ["calculator", "last"] as const,
  slots: ["slots"] as const,
  links: ["share-links"] as const,
  shared: (token: string) => ["shared", token] as const,
  plan: ["next-term-plan"] as const,
};

export const useUser = () => useQuery({ queryKey: keys.user, queryFn: repo.getUser });
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: repo.getProfile });
export const useRecords = () => useQuery({ queryKey: keys.records, queryFn: repo.getRecords });
export const useSlots = () => useQuery({ queryKey: keys.slots, queryFn: repo.getSlots });
export const useShareLinks = () => useQuery({ queryKey: keys.links, queryFn: repo.listShareLinks });
export const useLastCalculatorCode = () =>
  useQuery({ queryKey: keys.lastCalc, queryFn: repo.getLastCalculatorCode });

export const useCalculator = (code: string) =>
  useQuery({ queryKey: keys.calculator(code), queryFn: () => repo.getCalculator(code) });

export const useSharedSchedule = (token: string) =>
  useQuery({ queryKey: keys.shared(token), queryFn: () => repo.getSharedSchedule(token) });

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repo.signIn,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: repo.signOut, onSuccess: () => qc.clear() });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Profile) => repo.saveProfile(p),
    onSuccess: (p) => qc.setQueryData(keys.profile, p),
  });
}

export function useConfirmTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ records, issued }: { records: CourseRecord[]; issued: string }) =>
      repo.confirmTranscript(records, issued),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.records });
      qc.invalidateQueries({ queryKey: keys.profile });
    },
  });
}

export function useSaveRecords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: CourseRecord[]) => repo.saveRecords(records),
    onMutate: (records) => {
      const previous = qc.getQueryData<CourseRecord[]>(keys.records);
      qc.setQueryData(keys.records, records);
      return { previous };
    },
    onError: (_error, _records, context) => qc.setQueryData(keys.records, context?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.records }),
  });
}

export function useSkipTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repo.skipTranscript,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}

export function useSaveCalculator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: CalculatorState) => repo.saveCalculator(s),
    onSuccess: (s) => {
      qc.setQueryData(keys.calculator(s.courseCode), s);
      qc.setQueryData(keys.lastCalc, s.courseCode);
    },
  });
}

export function useSaveSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slot: ClassSlot) => repo.saveSlot(slot),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.slots }),
  });
}

export function useDeleteSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.slots }),
  });
}

export function useCreateShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (o: ShareLinkOptions) => repo.createShareLink(o),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.links }),
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => repo.revokeShareLink(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.links }),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: repo.resetData, onSuccess: () => qc.clear() });
}

export const useNextTermPlan = () => useQuery({ queryKey: keys.plan, queryFn: repo.getNextTermPlan });

export function useSaveNextTermPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codes: string[]) => repo.saveNextTermPlan(codes),
    onSuccess: (codes) => qc.setQueryData(keys.plan, codes),
  });
}
