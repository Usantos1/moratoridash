import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import type { SmartFormRecord, SmartFormStatus } from "../../../lib/smart-forms/types";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminBadge, AdminButton, AdminInput } from "../../../components/admin/ui";
import { useConfirm } from "../../../components/admin/ConfirmDialog";
import { useCan } from "../../../lib/session-context";

const FILTERS: Array<{ id: "ALL" | SmartFormStatus; label: string }> = [
  { id: "ALL", label: "Todos" },
  { id: "PUBLISHED", label: "Publicado" },
  { id: "DRAFT", label: "Rascunho" },
  { id: "ARCHIVED", label: "Arquivado" },
];

function statusTone(status: string): "live" | "warn" | "neutral" {
  if (status === "PUBLISHED") return "live";
  if (status === "DRAFT") return "warn";
  return "neutral";
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "DRAFT") return "Rascunho";
  return "Arquivado";
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function SmartFormsListPage() {
  const navigate = useNavigate();
  const can = useCan();
  const confirm = useConfirm();
  const canWrite = can("forms.write");
  const canDelete = can("forms.delete");
  const [items, setItems] = useState<SmartFormRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | SmartFormStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { pageSize: "50" };
      if (q.trim()) params.q = q.trim();
      if (status !== "ALL") params.status = status;
      const res = await smartFormsApi.list(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function createBlank() {
    setCreating(true);
    try {
      const form = await smartFormsApi.create({
        name: "Novo formulário",
        description: "Para uso interno da equipe",
      });
      toast.success("Formulário criado");
      navigate(`/admin/forms/${form.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setCreating(false);
    }
  }

  async function duplicate(id: string) {
    try {
      const copy = await smartFormsApi.duplicate(id);
      toast.success("Duplicado");
      navigate(`/admin/forms/${copy.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao duplicar");
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Arquivar este formulário?",
      description: "Ele sai da lista ativa. Você pode filtrar por Arquivado depois.",
      confirmLabel: "Arquivar",
      danger: true,
    });
    if (!ok) return;
    try {
      await smartFormsApi.remove(id);
      toast.success("Arquivado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao arquivar");
    }
  }

  const subtitle = useMemo(
    () => `${total} formulário${total === 1 ? "" : "s"}`,
    [total]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            Formulários
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FormsModuleNav />
          {canWrite && (
            <>
              <Link
                to="/admin/forms/templates"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border/80 bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/35"
              >
                Usar template
              </Link>
              <AdminButton disabled={creating} onClick={() => void createBlank()}>
                <Plus className="mr-1 h-4 w-4" />
                Novo formulário
              </AdminButton>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-surface-sm)]">
        <AdminInput
          className="min-w-[200px] flex-1"
          placeholder="Buscar por nome..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                status === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <AdminButton variant="ghost" onClick={() => void load()}>
          Buscar
        </AdminButton>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum formulário ainda.</p>
          {canWrite && (
            <AdminButton className="mt-4" onClick={() => void createBlank()}>
              Criar o primeiro
            </AdminButton>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((form) => {
            const leads = form._count?.leads || 0;
            const sessions = form._count?.sessions || 0;
            const conv = sessions > 0 ? Math.round((leads / sessions) * 100) : 0;
            return (
              <article
                key={form.id}
                className="flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-surface-sm)]"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquareText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-bold text-foreground">
                        {form.name}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        /f/{form.publicSlug}
                      </p>
                    </div>
                  </div>
                  <AdminBadge tone={statusTone(form.status)}>
                    {statusLabel(form.status)}
                  </AdminBadge>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <StatBox label="Leads" value={String(leads)} />
                  <StatBox label="Sessões" value={String(sessions)} />
                  <StatBox label="Conv." value={`${conv}%`} />
                </div>

                <p className="mb-3 text-[11px] text-muted-foreground">
                  Atualizado em {fmtDate(form.updatedAt)}
                </p>

                {canWrite && (
                  <Link
                    to={`/admin/forms/${form.id}`}
                    className="mb-2 inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110"
                  >
                    Editar
                  </Link>
                )}

                <div className="flex items-center gap-1.5">
                  <IconBtn
                    title="Abrir público"
                    onClick={() => window.open(`/f/${form.publicSlug}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </IconBtn>
                  {canWrite && (
                    <IconBtn title="Duplicar" onClick={() => void duplicate(form.id)}>
                      <Copy className="h-4 w-4" />
                    </IconBtn>
                  )}
                  {canDelete && (
                    <IconBtn title="Arquivar" onClick={() => void remove(form.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  )}
                  <IconBtn title="Mais">
                    <MoreHorizontal className="h-4 w-4" />
                  </IconBtn>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2.5 py-2 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:border-primary/35 hover:text-foreground"
    >
      {children}
    </button>
  );
}
