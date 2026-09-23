import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileText, ShieldCheck, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

type UserRow = { id: string; name: string; regulation: string | null; approved: boolean; created_at: string; roles: string[]; logins: number };
type MaterialRow = { id: string; title: string; file_path: string; teacher_id: string; teacher_name: string; regulation: string; views: number; downloads: number };
type Dashboard = { users: UserRow[]; materials: MaterialRow[] };

function AdminPage() {
  const { user, role, loading } = useAuth();
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"], enabled: !!user && role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard" as never);
      if (error) throw error;
      return data as Dashboard;
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  const call = async (fn: string, args: Record<string, unknown>, success: string) => {
    const { error } = await supabase.rpc(fn as never, args as never);
    if (error) return toast.error(error.message);
    toast.success(success); refresh();
  };
  const removeMaterial = async (material: MaterialRow) => {
    if (!confirm(`Delete “${material.title}”? This cannot be undone.`)) return;
    const { data: path, error } = await supabase.rpc("admin_delete_material" as never, { target_material: material.id } as never);
    if (error) return toast.error(error.message);
    if (path) await supabase.storage.from("materials").remove([path as string]);
    toast.success("PDF deleted"); refresh();
  };
  if (loading) return null;
  if (role !== "admin") return <div className="p-10 text-center">Administrator access is required.</div>;
  const data = dashboard.data;
  const students = data?.users.filter((x) => x.roles.includes("student")).length ?? 0;
  const faculty = data?.users.filter((x) => x.roles.includes("teacher")).length ?? 0;
  return <div className="min-h-screen bg-background">
    <AppHeader title="Administration" subtitle="Approve accounts, manage access, folders, and platform reach." badge="Admin" />
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Registrations" value={data?.users.length ?? 0} icon={<Users />} />
        <Metric label="Students" value={students} icon={<Users />} />
        <Metric label="Faculty" value={faculty} icon={<Users />} />
        <Metric label="PDFs uploaded" value={data?.materials.length ?? 0} icon={<FileText />} />
      </div>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-lg font-semibold">Users and approvals</h2>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="text-left text-muted-foreground"><tr><th className="pb-3">User</th><th>Roles</th><th>Approval</th><th>Logins</th><th className="text-right">Actions</th></tr></thead><tbody>
          {data?.users.map((person) => <tr key={person.id} className="border-t border-border"><td className="py-4"><p className="font-medium">{person.name || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{person.regulation || "No regulation"}</p></td><td>{person.roles.join(", ") || "—"}</td><td>{person.approved ? <span className="text-emerald-600">Approved</span> : <span className="text-amber-600">Pending</span>}</td><td>{person.logins}</td><td className="py-3 text-right space-x-2"><Button size="sm" variant="outline" onClick={() => call("admin_set_approval", { target_user: person.id, approved: !person.approved }, person.approved ? "Approval removed" : "User approved")}><Check className="mr-1 h-3.5 w-3.5" />{person.approved ? "Revoke" : "Approve"}</Button><Button size="sm" variant="outline" onClick={() => call("admin_set_primary_role", { target_user: person.id, new_role: person.roles.includes("teacher") ? "student" : "teacher" }, "Role updated")}>Make {person.roles.includes("teacher") ? "student" : "faculty"}</Button><Button size="sm" variant="outline" onClick={() => call("admin_set_primary_role", { target_user: person.id, new_role: "admin" }, "Administrator access granted")}>Make admin</Button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"><h2 className="font-display text-lg font-semibold">Faculty PDF folders and reach</h2><p className="mt-1 text-sm text-muted-foreground">Each faculty member’s files are stored in their own folder; you can remove any file.</p><div className="mt-5 grid gap-3">{data?.materials.map((m) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.teacher_name} · {m.regulation} · Folder: {m.teacher_id}</p><p className="mt-1 text-xs text-muted-foreground">{m.views} views · {m.downloads} downloads</p></div><Button variant="destructive" size="sm" onClick={() => removeMaterial(m)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></div>)}</div></section>
    </main>
  </div>;
}
function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"><div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }
