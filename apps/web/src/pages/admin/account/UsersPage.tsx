import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../../lib/admin-api";
import { useSession } from "../../../lib/session-context";
import { useConfirm } from "../../../components/admin/ConfirmDialog";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
} from "../../../components/admin/ui";
import { PageHeaderPremium } from "../../../components/admin/PageHeaderPremium";

type Member = Awaited<ReturnType<typeof adminApi.members>>["items"][number];
type Role = Awaited<ReturnType<typeof adminApi.roles>>["items"][number];

export function UsersPage() {
  const { workspace, user, can } = useSession();
  const confirm = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        adminApi.members(workspace.id),
        adminApi.roles(workspace.id),
      ]);
      setMembers(membersRes.items);
      setRoles(rolesRes.items);
      setRoleId((current) => current || rolesRes.items.find((r) => r.slug === "editor")?.id || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    if (!workspace || !email.trim()) return;
    setInviting(true);
    try {
      const res = await adminApi.addMember(workspace.id, {
        email: email.trim(),
        name: name.trim() || undefined,
        roleId: roleId || null,
      });
      setEmail("");
      setName("");
      await load();
      if (res.temporaryPassword) {
        toast.success(`Usuário criado. Senha temporária: ${res.temporaryPassword}`, {
          duration: 15000,
        });
      } else {
        toast.success("Usuário adicionado ao workspace");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar usuário");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: Member, nextRoleId: string) {
    if (!workspace) return;
    try {
      await adminApi.updateMember(workspace.id, member.id, { roleId: nextRoleId || null });
      await load();
      toast.success("Cargo atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar cargo");
    }
  }

  async function toggleActive(member: Member) {
    if (!workspace) return;
    try {
      await adminApi.updateMember(workspace.id, member.id, { active: !member.active });
      await load();
      toast.success(member.active ? "Acesso suspenso" : "Acesso reativado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar acesso");
    }
  }

  async function resetPassword(member: Member) {
    if (!workspace) return;
    try {
      const res = await adminApi.resetMemberPassword(workspace.id, member.id);
      toast.success(`Nova senha temporária: ${res.temporaryPassword}`, { duration: 15000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao redefinir senha");
    }
  }

  async function removeMember(member: Member) {
    if (!workspace) return;
    const ok = await confirm({
      title: "Remover usuário?",
      description: `${member.user.email} perderá o acesso a este workspace.`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.removeMember(workspace.id, member.id);
      await load();
      toast.success("Usuário removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover usuário");
    }
  }

  const editable = can("users.manage");

  return (
    <div className="space-y-5">
      <PageHeaderPremium
        eyebrow="Conta"
        title="Usuários"
        description={`Membros com acesso ao workspace ${workspace?.name ?? ""}.`}
        showModuleNav={false}
      />

      {editable && (
        <AdminPanel
          title="Adicionar usuário"
          subtitle="Se o e-mail ainda não existir, criamos a conta com senha temporária."
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <AdminField label="E-mail">
              <AdminInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@cliente.com"
              />
            </AdminField>
            <AdminField label="Nome">
              <AdminInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Opcional"
              />
            </AdminField>
            <AdminField label="Cargo">
              <AdminSelect value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Sem cargo</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <div className="flex items-end">
              <AdminButton
                className="w-full"
                onClick={() => void invite()}
                disabled={inviting || !email.trim()}
              >
                {inviting ? "Adicionando…" : "Adicionar"}
              </AdminButton>
            </div>
          </div>
        </AdminPanel>
      )}

      <AdminPanel title="Membros" subtitle={loading ? "Carregando…" : `${members.length} usuário(s)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2 pr-3">Usuário</th>
                <th className="py-2 pr-3">Cargo</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/40">
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-foreground">
                      {member.user.name || member.user.email}
                      {member.user.id === user.id && (
                        <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{member.user.email}</div>
                  </td>
                  <td className="py-3 pr-3">
                    {editable ? (
                      <AdminSelect
                        value={member.role?.id ?? ""}
                        onChange={(e) => void changeRole(member, e.target.value)}
                        className="min-w-[150px]"
                      >
                        <option value="">Sem cargo</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </AdminSelect>
                    ) : (
                      <span className="text-muted-foreground">{member.role?.name ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <AdminBadge tone={member.active ? "success" : "danger"}>
                      {member.active ? "Ativo" : "Suspenso"}
                    </AdminBadge>
                  </td>
                  <td className="py-3 pr-3">
                    {editable ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <AdminButton variant="ghost" onClick={() => void toggleActive(member)}>
                          {member.active ? "Suspender" : "Reativar"}
                        </AdminButton>
                        <AdminButton variant="ghost" onClick={() => void resetPassword(member)}>
                          Nova senha
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => void removeMember(member)}>
                          Remover
                        </AdminButton>
                      </div>
                    ) : (
                      <span className="block text-right text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum usuário neste workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
