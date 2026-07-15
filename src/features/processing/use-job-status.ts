"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTerminal } from "@/server/services/job-transitions";
import type { JobAction, JobSnapshot } from "@/features/processing/types";

/**
 * Reusable job-status hook. Today it polls the job endpoint; the polling is fully
 * encapsulated here so it can be swapped for Supabase Realtime without touching
 * the UI. Polling stops automatically once the job reaches a terminal state.
 */
export function useJobStatus(projectId: string, initial?: JobSnapshot) {
  const queryClient = useQueryClient();
  const key = React.useMemo(() => ["job", projectId] as const, [projectId]);

  const query = useQuery<JobSnapshot>({
    queryKey: key,
    initialData: initial,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/job`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load processing status.");
      return (await res.json()) as JobSnapshot;
    },
    refetchInterval: (q) => {
      const status = q.state.data?.job?.status;
      if (status && isTerminal(status)) return false;
      return 1200;
    },
  });

  const mutation = useMutation({
    mutationFn: async (action: JobAction) => {
      const res = await fetch(`/api/projects/${projectId}/job`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed.");
      return (await res.json()) as JobSnapshot;
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(key, snapshot);
    },
  });

  const startedRef = React.useRef(false);
  React.useEffect(() => {
    // Kick off processing once when a pending job is first observed.
    const status = query.data?.job?.status;
    if (!startedRef.current && status === "pending") {
      startedRef.current = true;
      mutation.mutate("start");
    }
  }, [query.data?.job?.status, mutation]);

  const job = query.data?.job ?? null;
  const terminal = job ? isTerminal(job.status) : false;

  return {
    snapshot: query.data ?? { project: null, job: null },
    job,
    project: query.data?.project ?? null,
    isLoading: query.isLoading,
    isTerminal: terminal,
    error: query.error,
    start: () => mutation.mutate("start"),
    retry: () => mutation.mutate("retry"),
    cancel: () => mutation.mutate("cancel"),
    isMutating: mutation.isPending,
  };
}
