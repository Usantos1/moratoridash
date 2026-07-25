import { Link } from "react-router-dom";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminButton } from "../../../components/admin/ui";

const CHECKLIST = [
  "Publique ao menos um formulário no builder.",
  "Configure Pixel / GTM / GA / Ads na aba Pixels do formulário.",
  "Defina faixas de Lead score (frio / morno / quente).",
  "Opcional: webhook HTTPS com segredo HMAC.",
  "Opcional: domínio próprio (CNAME) na aba Domínio.",
  "Teste o fluxo no Simulador antes de publicar.",
];

export function SmartConfigPage() {
  const publicBase =
    typeof window !== "undefined"
      ? `${window.location.origin}/f/{publicSlug}`
      : "https://app.muratorimkt.com.br/f/{publicSlug}";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checklist e atalhos do módulo Formulários Inteligentes.
          </p>
        </div>
        <FormsModuleNav />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
          <h2 className="text-[15px] font-bold text-foreground">Checklist rápido</h2>
          <ol className="mt-4 space-y-3">
            {CHECKLIST.map((item, i) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/admin/forms/templates">
              <AdminButton variant="ghost">Templates</AdminButton>
            </Link>
            <Link to="/admin/forms">
              <AdminButton>Meus formulários</AdminButton>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
            <h2 className="text-[15px] font-bold text-foreground">Link público</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada formulário ganha um slug único após publicar.
            </p>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5 font-mono text-xs text-foreground">
              {publicBase}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
            <h2 className="text-[15px] font-bold text-foreground">Domínio próprio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No builder → aba Domínio: cadastre o hostname do cliente e aponte o CNAME.
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>1. DNS do cliente: CNAME → app.muratorimkt.com.br</li>
              <li>2. Cole o hostname e clique em Adicionar</li>
              <li>3. Verificar até status = Ativo</li>
            </ol>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5 text-center font-mono text-xs">
              CNAME → app.muratorimkt.com.br
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
