/// Chaves de permissão granulares usadas por cargos de workspace.
export const PERMISSIONS = [
  "workspace.manage",
  "users.manage",
  "roles.manage",
  "forms.read",
  "forms.write",
  "forms.publish",
  "forms.delete",
  "leads.read",
  "leads.delete",
  "leads.export",
  "settings.read",
  "settings.write",
  "domains.manage",
  "legacy.access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: Array<{
  label: string;
  items: Array<{ key: Permission; label: string }>;
}> = [
  {
    label: "Workspace",
    items: [
      { key: "workspace.manage", label: "Editar dados do workspace" },
      { key: "users.manage", label: "Gerenciar usuários e convites" },
      { key: "roles.manage", label: "Gerenciar cargos e permissões" },
    ],
  },
  {
    label: "Formulários",
    items: [
      { key: "forms.read", label: "Visualizar formulários" },
      { key: "forms.write", label: "Criar e editar formulários" },
      { key: "forms.publish", label: "Publicar formulários" },
      { key: "forms.delete", label: "Excluir formulários" },
      { key: "domains.manage", label: "Gerenciar domínios" },
    ],
  },
  {
    label: "Leads",
    items: [
      { key: "leads.read", label: "Visualizar leads" },
      { key: "leads.export", label: "Exportar leads" },
      { key: "leads.delete", label: "Excluir leads" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { key: "settings.read", label: "Visualizar configurações" },
      { key: "settings.write", label: "Editar configurações" },
      { key: "legacy.access", label: "Acessar módulos legados" },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function sanitizePermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<Permission>();
  for (const value of values) {
    if (typeof value === "string" && isPermission(value)) unique.add(value);
  }
  return ALL_PERMISSIONS.filter((key) => unique.has(key));
}

/// Cargos criados junto com todo workspace novo.
export const SYSTEM_ROLES: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    slug: "owner",
    name: "Owner",
    description: "Acesso total ao workspace",
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: "admin",
    name: "Administrador",
    description: "Gerencia formulários, leads e usuários",
    permissions: [
      "users.manage",
      "forms.read",
      "forms.write",
      "forms.publish",
      "forms.delete",
      "leads.read",
      "leads.delete",
      "leads.export",
      "settings.read",
      "settings.write",
      "domains.manage",
      "legacy.access",
    ],
  },
  {
    slug: "editor",
    name: "Editor",
    description: "Cria e publica formulários",
    permissions: ["forms.read", "forms.write", "forms.publish", "leads.read", "settings.read"],
  },
  {
    slug: "comercial",
    name: "Comercial",
    description: "Trabalha os leads recebidos",
    permissions: ["forms.read", "leads.read", "leads.export"],
  },
  {
    slug: "leitor",
    name: "Leitor",
    description: "Somente leitura",
    permissions: ["forms.read", "leads.read", "settings.read"],
  },
];
