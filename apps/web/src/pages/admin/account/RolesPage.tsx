import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../../lib/admin-api";
import { useSession } from "../../../lib/session-context";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
} from "../../../components/admin/ui";
import { PageHeaderPremium } from "../../../components/admin/PageHeaderPremium";

type Role = Awaited<ReturnType<typeof adminApi.roles>>["items"][number];
type PermissionGroup = Awaited<ReturnType<typeof adminApi.permissionCatalog>>["groups"][number];

export function RolesPage() {
  const { workspace, can } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [newRoleName, setNewRoleName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      const [rolesRes, catalog] = await Promise.all([
        adminApi.roles(workspace.id),
        adminApi.permissionCatalog(),
      ]);
      setRoles(rolesRes.items);
      setGroups(catalog.groups);
      setSelectedId((current) => current ?? rolesRes.items[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar cargos");
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = roles.find((role) => role.id === selectedId) ?? null;

  useEffect(() => {
    setDraft(new Set(selected?.permissions ?? []));
  }, [selected]);

  const editable = can("roles.manage");

  function toggle(permission: string) {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function savePermissions() {
    if (!workspace || !selected) return;
    setSaving(true);
    try {
      await adminApi.updateRole(workspace.id, selected.id, {
        permissions: Array.from(draft),
      });
      await load();
      toast.success("Permissões salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    if (!workspace || !newRoleName.trim()) return;
    try {
      await adminApi.createRole(workspace.id, { name: newRoleName.trim(), permissions: [] });
      setNewRoleName("");
      await load();
      toast.success("Cargo criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar cargo");
    }
  }

  async function deleteRole(role: Role) {
    if (!workspace) return;
    if (!window.confirm(`Excluir o cargo ${role.name}?`)) return;
    try {
      await adminApi.deleteRole(workspace.id, role.id);
      setSelectedId(null);
      await load();
      toast.success("Cargo excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir cargo");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeaderPremium
        eyebrow="Conta"
        title="Cargos e permissões"
        description="Cada workspace tem seus próprios cargos. O backend continua validando tudo."
        showModuleNav={false}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <AdminPanel title="Cargos" subtitle={`${roles.length} cargo(s)`}>
          <ul className="space-y-1">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    role.id === selectedId ? "bg-primary/10 font-semibold" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{role.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {role._count.memberships} usuário(s) · {role.permissions.length} permissões
                    </span>
                  </span>
                  {role.isSystem && <AdminBadge>Padrão</AdminBadge>}
                </button>
              </li>
            ))}
          </ul>

          {editable && (
            <div className="mt-4 border-t border-border/60 pt-4">
              <AdminField label="Novo cargo">
                <AdminInput
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ex.: Suporte"
                />
              </AdminField>
              <AdminButton
                className="mt-3 w-full"
                variant="ghost"
                onClick={() => void createRole()}
                disabled={!newRoleName.trim()}
              >
                Criar cargo
              </AdminButton>
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title={selected ? `Permissões · ${selected.name}` : "Permissões"}
          subtitle={
            selected?.description ??
            "Selecione um cargo para editar a matriz de permissões do workspace."
          }
        >
          {!selected ? (
            <p className="text-sm text-muted-foreground">Nenhum cargo selecionado.</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.key}>
                          <label className="flex items-start gap-2.5 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring/25"
                              checked={draft.has(item.key)}
                              disabled={!editable}
                              onChange={() => toggle(item.key)}
                            />
                            <span className="min-w-0">
                              <span className="block">{item.label}</span>
                              <span className="block font-mono text-[11px] text-muted-foreground">
                                {item.key}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {editable && (
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
                  <AdminButton onClick={() => void savePermissions()} disabled={saving}>
                    {saving ? "Salvando…" : "Salvar permissões"}
                  </AdminButton>
                  {!selected.isSystem && (
                    <AdminButton variant="danger" onClick={() => void deleteRole(selected)}>
                      Excluir cargo
                    </AdminButton>
                  )}
                </div>
              )}
            </>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
