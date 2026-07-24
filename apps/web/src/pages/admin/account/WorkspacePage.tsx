import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../../lib/admin-api";
import { useSession } from "../../../lib/session-context";
import { assetSrc } from "../../../lib/asset-url";
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

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

  async function uploadLogo(file: File | null) {
    if (!workspace || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (PNG, JPG ou SVG)");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Máx. 4 MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      await adminApi.uploadWorkspaceLogo(workspace.id, dataUrl);
      await reload();
      const refreshed = await adminApi.workspace(workspace.id);
      setDetail(refreshed);
      toast.success("Logo atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!workspace) return;
    setUploadingLogo(true);
    try {
      await adminApi.updateWorkspace(workspace.id, { logoUrl: null });
      await reload();
      const refreshed = await adminApi.workspace(workspace.id);
      setDetail(refreshed);
      toast.success("Logo removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover logo");
    } finally {
      setUploadingLogo(false);
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

  const logoSrc = assetSrc(detail?.logoUrl ?? workspace.logoUrl);
  const canManage = can("workspace.manage");

  return (
    <div className="space-y-5">
      <PageHeaderPremium
        eyebrow="Conta"
        title="Workspace"
        description="Dados do cliente, logo, uso e criação de novos workspaces."
        showModuleNav={false}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat label="Membros" value={detail?._count.memberships ?? "—"} />
        <AdminStat label="Formulários" value={detail?._count.smartForms ?? "—"} />
        <AdminStat label="Leads (legado)" value={detail?._count.leads ?? "—"} />
      </div>

      <AdminPanel
        title="Logo do cliente"
        subtitle="Aparece como miniatura no seletor de workspace no topo do painel."
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/40">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-xl font-extrabold text-primary">
                {(workspace.name || "M")[0].toUpperCase()}
              </span>
            )}
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
              />
              <AdminButton
                variant="ghost"
                disabled={uploadingLogo}
                onClick={() => logoRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {uploadingLogo ? "Enviando…" : logoSrc ? "Trocar logo" : "Enviar logo"}
              </AdminButton>
              {logoSrc && (
                <AdminButton
                  variant="danger"
                  disabled={uploadingLogo}
                  onClick={() => void removeLogo()}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remover
                </AdminButton>
              )}
            </div>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Identificação" subtitle="O slug aparece em URLs internas e relatórios.">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Nome do cliente">
            <AdminInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
            />
          </AdminField>
          <AdminField label="Slug">
            <AdminInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!canManage}
            />
          </AdminField>
        </div>
        {canManage && (
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
          {workspaces.map((item) => {
            const itemLogo = assetSrc(item.logoUrl);
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    {itemLogo ? (
                      <img src={itemLogo} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-xs font-extrabold text-primary">
                        {item.name[0].toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.slug} · {item.role?.name ?? "Sem cargo"}
                    </div>
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
            );
          })}
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
