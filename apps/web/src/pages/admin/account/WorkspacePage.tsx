import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  ImagePlus,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../../lib/admin-api";
import { useSession } from "../../../lib/session-context";
import { assetSrc } from "../../../lib/asset-url";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
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
  const [showCreate, setShowCreate] = useState(false);
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
      setDetail(await adminApi.workspace(workspace.id));
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
      setDetail(await adminApi.workspace(workspace.id));
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
      setShowCreate(false);
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
  const canUsers = can("users.manage");
  const canRoles = can("roles.manage");
  const dirty = name !== workspace.name || slug !== workspace.slug;
  const isSuper = user.role === "superadmin";

  const stats = [
    {
      label: "Membros",
      value: detail?._count.memberships ?? "—",
      icon: Users,
      to: canUsers ? "/admin/users" : null,
    },
    {
      label: "Formulários",
      value: detail?._count.smartForms ?? "—",
      icon: FileText,
      to: can("forms.read") ? "/admin/forms" : null,
    },
    {
      label: "Seu cargo",
      value: workspaces.find((w) => w.id === workspace.id)?.role?.name ?? "—",
      icon: Shield,
      to: canRoles ? "/admin/roles" : null,
      isText: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderPremium
        eyebrow=""
        title="Workspace"
        showModuleNav={false}
        actions={
          isSuper ? (
            <AdminButton onClick={() => setShowCreate((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo workspace
            </AdminButton>
          ) : undefined
        }
      />

      {/* Identidade do cliente */}
      <section className="overflow-hidden rounded-[var(--radius)] border border-border/70 bg-card shadow-[var(--shadow-surface-sm)]">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/40 sm:h-28 sm:w-28">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-3xl font-extrabold text-primary">
                  {(workspace.name || "M")[0].toUpperCase()}
                </span>
              )}
            </div>
            {canManage && (
              <>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  title={logoSrc ? "Trocar logo" : "Enviar logo"}
                  onClick={() => logoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {workspace.name}
                  </h2>
                  <AdminBadge tone={workspace.active ? "success" : "danger"}>
                    {workspace.active ? "Ativo" : "Inativo"}
                  </AdminBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono text-[13px]">/{workspace.slug}</span>
                  {workspace.role?.name ? (
                    <>
                      {" "}
                      · seu cargo:{" "}
                      <span className="font-medium text-foreground">{workspace.role.name}</span>
                    </>
                  ) : null}
                </p>
              </div>
              {canManage && logoSrc && (
                <AdminButton
                  variant="ghost"
                  disabled={uploadingLogo}
                  onClick={() => void removeLogo()}
                  className="!px-3"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remover logo
                </AdminButton>
              )}
            </div>

            {canManage ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Nome do cliente">
                  <AdminInput value={name} onChange={(e) => setName(e.target.value)} />
                </AdminField>
                <AdminField label="Slug">
                  <AdminInput value={slug} onChange={(e) => setSlug(e.target.value)} />
                </AdminField>
              </div>
            ) : null}

            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton onClick={() => void save()} disabled={saving || !dirty}>
                  {saving ? "Salvando…" : "Salvar alterações"}
                </AdminButton>
                {dirty && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setName(workspace.name);
                      setSlug(workspace.slug);
                    }}
                  >
                    Descartar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats + atalhos */}
        <div className="grid border-t border-border/60 sm:grid-cols-3">
          {stats.map((s) => {
            const body = (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </div>
                  <div
                    className={`mt-0.5 truncate font-bold text-foreground ${
                      s.isText ? "text-sm" : "text-xl tabular-nums"
                    }`}
                  >
                    {s.value}
                  </div>
                </div>
                {s.to ? (
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                ) : null}
              </>
            );
            const className =
              "group flex items-center gap-3 px-5 py-4 transition hover:bg-accent/40 sm:px-6";
            return s.to ? (
              <Link key={s.label} to={s.to} className={className}>
                {body}
              </Link>
            ) : (
              <div key={s.label} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      {/* Criar workspace (superadmin) */}
      {isSuper && showCreate && (
        <section className="rounded-[var(--radius)] border border-primary/30 bg-primary/5 p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
          <h2 className="text-[15px] font-bold text-foreground">Novo workspace</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cria o cliente com cargos padrão e você como Owner.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <AdminField label="Nome do cliente">
                <AdminInput
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Clínica Vida"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void createWorkspace();
                  }}
                />
              </AdminField>
            </div>
            <AdminButton
              onClick={() => void createWorkspace()}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Criando…" : "Criar"}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </AdminButton>
          </div>
        </section>
      )}

      {/* Lista de workspaces */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Seus workspaces</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Troque de cliente sem sair do painel — os dados ficam isolados.
            </p>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {workspaces.length} {workspaces.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((item) => {
            const itemLogo = assetSrc(item.logoUrl);
            const active = item.id === workspace.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={active}
                onClick={() => {
                  if (!active) void switchWorkspace(item.id);
                }}
                className={`flex items-center gap-3 rounded-[var(--radius)] border p-4 text-left shadow-[var(--shadow-surface-sm)] transition ${
                  active
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/70 bg-card hover:border-primary/35 hover:bg-accent/40"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                  {itemLogo ? (
                    <img src={itemLogo} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-sm font-extrabold text-primary">
                      {item.name[0].toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.role?.name ?? "Sem cargo"} · {item.slug}
                  </span>
                </span>
                {active ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-primary">Entrar</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
