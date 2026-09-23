import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { role: "student" } });
    const { data: profile } = await supabase.from("profiles").select("is_approved").eq("id", data.user.id).maybeSingle();
    if (!profile?.is_approved) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { role: "student", pending: "1" } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
