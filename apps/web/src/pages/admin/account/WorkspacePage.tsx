import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../../lib/admin-api";
import { useSession } from "../../../lib/session-context";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminStat,
} from "../../../components/admin/ui";
import { PageHeaderPremium } from "../../../components/admin/PageHeaderPremium";

type WorkspaceDetail = Awaited<ReturnType<typeof adminApi.workspace>>;

export function WorkspacePage() {
  const { workspace, workspaces, user, can, reload, switchWorkspace } = useSession();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name);
    setSlug(workspace.slug);
    void adminApi
      .workspace(workspace.id)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar workspace"));
  }, [workspace]);

  async function save() {
    if (!workspace) return;
    setSaving(true);
    try {
      await adminApi.updateWorkspace(workspace.id, { name, slug });
      await reload();
      toast.success("Workspace atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function createWorkspace() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await adminApi.createWorkspace({ name: newName.trim() });
      setNewName("");
      await switchWorkspace(created.id);
      toast.success("Workspace criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar workspace");
    } finally {
      setCreating(false);
    }
  }

  if (!workspace) {
    return <p className="text-sm text-muted-foreground">Nenhum workspace disponível.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeaderPremium
        eyebrow="Conta"
        title="Workspace"
        description="Dados do cliente, uso e criação de novos workspaces."
        showModuleNav={false}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat label="Membros" value={detail?._count.memberships ?? "—"} />
        <AdminStat label="Formulários" value={detail?._count.smartForms ?? "—"} />
        <AdminStat label="Leads (legado)" value={detail?._count.leads ?? "—"} />
      </div>

      <AdminPanel title="Identificação" subtitle="O slug aparece em URLs internas e relatórios.">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Nome do cliente">
            <AdminInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!can("workspace.manage")}
            />
          </AdminField>
          <AdminField label="Slug">
            <AdminInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!can("workspace.manage")}
            />
          </AdminField>
        </div>
        {can("workspace.manage") && (
          <div className="mt-4 flex items-center gap-3">
            <AdminButton onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </AdminButton>
            <AdminBadge tone={workspace.active ? "success" : "danger"}>
              {workspace.active ? "Ativo" : "Inativo"}
            </AdminBadge>
          </div>
        )}
      </AdminPanel>

      <AdminPanel
        title="Seus workspaces"
        subtitle="Troque de cliente sem sair do painel; os dados são isolados."
      >
        <ul className="divide-y divide-border/60">
          {workspaces.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.slug} · {item.role?.name ?? "Sem cargo"}
                </div>
              </div>
              {item.id === workspace.id ? (
                <AdminBadge tone="live">Ativo</AdminBadge>
              ) : (
                <AdminButton variant="ghost" onClick={() => void switchWorkspace(item.id)}>
                  Entrar
                </AdminButton>
              )}
            </li>
          ))}
        </ul>
      </AdminPanel>

      {user.role === "superadmin" && (
        <AdminPanel
          title="Novo workspace"
          subtitle="Cria o cliente já com os cargos padrão e você como Owner."
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <AdminField label="Nome do cliente">
                <AdminInput
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Clínica Vida"
                />
              </AdminField>
            </div>
            <AdminButton onClick={() => void createWorkspace()} disabled={creating || !newName.trim()}>
              {creating ? "Criando…" : "Criar workspace"}
            </AdminButton>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
