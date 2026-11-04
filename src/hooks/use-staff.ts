import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Department } from "@/lib/departments";

export type StaffProfile = {
  userId: string;
  email: string;
  role: "master" | "lead" | "member" | null;
  department: Department | null;
  displayName: string;
};

export const staffProfileQuery = queryOptions({
  queryKey: ["staff-profile"],
  queryFn: async (): Promise<StaffProfile | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;
    const { data } = await supabase
      .from("user_roles")
      .select("role, department, display_name")
      .eq("user_id", user.id)
      .order("role")
      .limit(1)
      .maybeSingle();
    return {
      userId: user.id,
      email: user.email ?? "",
      role: (data?.role as StaffProfile["role"]) ?? null,
      department: (data?.department as Department | null) ?? null,
      displayName: data?.display_name || user.email || "Staff",
    };
  },
  staleTime: 60_000,
});

export function useStaffProfile() {
  return useQuery(staffProfileQuery);
}
