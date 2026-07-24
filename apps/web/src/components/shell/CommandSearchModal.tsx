import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { useSession } from "../../lib/session-context";

type SearchItem = {
  to: string;
  label: string;
  desc: string;
  group: string;
  icon: LucideIcon;
  permission?: string;
  keywords?: string[];
};

const SEARCH_CATALOG: SearchItem[] = [
  {
    to: "/admin",
    label: "Dashboard",
    desc: "Visão geral de formulários e conversões",
    group: "Principal",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/forms",
    label: "Formulários",
    desc: "Lista e gestão dos Smart Forms",
    group: "Formulários",
    icon: ClipboardList,
    permission: "forms.read",
    keywords: ["forms", "smart forms", "fluxos"],
  },
  {
    to: "/admin/forms/templates",
    label: "Templates",
    desc: "Fluxos conversacionais prontos por segmento",
    group: "Formulários",
    icon: Workflow,
    permission: "forms.read",
    keywords: ["modelo", "pronto"],
  },
  {
    to: "/admin/forms/leads",
    label: "Leads",
    desc: "Contatos capturados por formulário",
    group: "Formulários",
    icon: Users,
    permission: "leads.read",
    keywords: ["contato", "qualificação"],
  },
  {
    to: "/admin/forms/config",
    label: "Configuração do módulo",
    desc: "Checklist e atalhos dos formulários inteligentes",
    group: "Formulários",
    icon: Settings2,
    permission: "settings.read",
    keywords: ["config", "checklist"],
  },
  {
    to: "/admin/workspace",
    label: "Workspace",
    desc: "Dados do cliente e troca de workspace",
    group: "Conta",
    icon: ShieldCheck,
    permission: "workspace.manage",
    keywords: ["cliente", "tenant"],
  },
  {
    to: "/admin/users",
    label: "Usuários",
    desc: "Membros e acessos do workspace",
    group: "Conta",
    icon: Users,
    permission: "users.manage",
    keywords: ["membros", "equipe"],
  },
  {
    to: "/admin/roles",
    label: "Cargos",
    desc: "Permissões por cargo",
    group: "Conta",
    icon: KeyRound,
    permission: "roles.manage",
    keywords: ["permissões", "rbac"],
  },
  {
    to: "/admin/whatsapp",
    label: "WhatsApp",
    desc: "Número e template de mensagem",
    group: "Instalação",
    icon: MessageCircle,
    permission: "settings.write",
    keywords: ["zap", "mensagem"],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommandSearchModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { can } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    const allowed = SEARCH_CATALOG.filter((item) => !item.permission || can(item.permission));
    const term = q.trim().toLowerCase();
    if (!term) return allowed;
    return allowed.filter((item) => {
      const hay = [item.label, item.desc, item.group, item.to, ...(item.keywords || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [can, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of items) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[active];
        if (item) {
          navigate(item.to);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, navigate, onClose]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh] sm:px-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fechar busca"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-search-title"
        className="relative z-10 flex max-h-[min(640px,76vh)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_24px_80px_rgba(16,24,40,0.28)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f4] px-5 py-4">
          <div>
            <h2 id="command-search-title" className="text-lg font-bold text-[#1d202b]">
              Ir para…
            </h2>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Busca global para navegar mais rápido no painel
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-[#e5e7eb] px-2 py-1 text-[11px] font-semibold text-[#6b7280]">
            Atalho Ctrl+K
          </span>
        </div>

        <div className="px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ad]" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar página, módulo ou rota…"
              className="h-11 w-full rounded-full border border-[#d8dde6] bg-white pl-10 pr-4 text-sm text-[#1d202b] outline-none transition placeholder:text-[#9aa1ad] focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[#6b7280]">
              Nenhum resultado para “{q}”.
            </p>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9aa1ad]">
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const Icon = item.icon;
                    const isActive = idx === active;
                    return (
                      <li key={item.to}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => {
                            navigate(item.to);
                            onClose();
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border-l-2 px-3 py-3 text-left transition ${
                            isActive
                              ? "border-l-primary bg-primary/10"
                              : "border-l-transparent hover:bg-[#f3f4f6]"
                          }`}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ebf3ff] text-brand-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold text-[#1d202b]">
                              {item.label}
                            </span>
                            <span className="block text-xs leading-5 text-[#6b7280]">
                              {item.desc}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#eef0f4] px-5 py-2.5 text-[11px] text-[#9aa1ad]">
          ↑↓ navegar · Enter abrir · Esc fechar
        </div>
      </div>
    </div>
  );
}
