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
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  desc?: string;
  icon: LucideIcon;
  end?: boolean;
  /// Permissão necessária; ausente = visível para qualquer membro.
  permission?: string;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

/// Atalhos sempre visíveis no topo. Dashboard vive apenas em /admin.
export const PRIMARY_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/forms", label: "Formulários", icon: ClipboardList, permission: "forms.read" },
  { to: "/admin/forms/leads", label: "Leads", icon: Users, permission: "leads.read" },
];

/// Abas do módulo Smart Forms (sem repetir a dashboard geral).
export const FORMS_MODULE_NAV: NavItem[] = [
  { to: "/admin/forms", label: "Formulários", icon: ClipboardList, end: true, permission: "forms.read" },
  { to: "/admin/forms/templates", label: "Templates", icon: Workflow, permission: "forms.read" },
  { to: "/admin/forms/leads", label: "Leads", icon: Users, permission: "leads.read" },
  { to: "/admin/forms/config", label: "Configurações", icon: Settings2, permission: "settings.read" },
];

export const MENU_GROUPS: NavGroup[] = [
  {
    group: "Formulário inteligente",
    items: [
      {
        to: "/admin/forms/templates",
        label: "Templates",
        desc: "Fluxos prontos",
        icon: Workflow,
        permission: "forms.read",
      },
      {
        to: "/admin/forms/config",
        label: "Configuração",
        desc: "Checklist do módulo",
        icon: Settings2,
        permission: "settings.read",
      },
    ],
  },
  {
    group: "Conta",
    items: [
      {
        to: "/admin/workspace",
        label: "Workspace",
        desc: "Dados do cliente",
        icon: ShieldCheck,
        permission: "workspace.manage",
      },
      {
        to: "/admin/users",
        label: "Usuários",
        desc: "Membros e acessos",
        icon: Users,
        permission: "users.manage",
      },
      {
        to: "/admin/roles",
        label: "Cargos",
        desc: "Permissões por cargo",
        icon: KeyRound,
        permission: "roles.manage",
      },
    ],
  },
  {
    group: "Instalação",
    items: [
      {
        to: "/admin/whatsapp",
        label: "WhatsApp",
        desc: "Número e template",
        icon: MessageCircle,
        permission: "settings.write",
      },
    ],
  },
];

export function filterNav<T extends { permission?: string }>(
  items: T[],
  can: (permission: string) => boolean,
): T[] {
  return items.filter((item) => !item.permission || can(item.permission));
}
