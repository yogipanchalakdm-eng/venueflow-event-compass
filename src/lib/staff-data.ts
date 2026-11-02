import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;
export type SubmissionRow = Tables<"submissions">;
export type RequestRow = Tables<"requests">;

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () => {
    const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const requestIndexQuery = queryOptions({
  queryKey: ["request-index"],
  queryFn: async () => {
    const { data, error } = await supabase.from("requests").select("id, event_id, department, status");
    if (error) throw error;
    return data;
  },
});

export const eventDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const [ev, subs, reqs] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).maybeSingle(),
        supabase.from("submissions").select("*").eq("event_id", id).order("created_at"),
        supabase.from("requests").select("*").eq("event_id", id).order("created_at"),
      ]);
      if (ev.error) throw ev.error;
      return { event: ev.data, submissions: subs.data ?? [], requests: reqs.data ?? [] };
    },
  });

export const staffAccountsQuery = queryOptions({
  queryKey: ["staff-accounts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_roles").select("user_id, role, department, display_name").order("role");
    if (error) throw error;
    return data;
  },
});
