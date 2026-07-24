// Smoke test do isolamento multi-tenant: rode com a API local no ar.
//   node scripts/smoke-workspaces.mjs
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const BASE = process.env.SMOKE_API_URL || "http://127.0.0.1:3340";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match) out[match[1]] = match[2];
    }
    return out;
  } catch {
    return {};
  }
}

const env = loadEnv();
const adminEmail = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

async function api(method, path, { token, workspaceId, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

function check(condition, message) {
  if (!condition) {
    console.error(`FALHOU: ${message}`);
    process.exit(1);
  }
  console.log(`ok · ${message}`);
}

const suffix = randomUUID().slice(0, 6);

const login = await api("POST", "/api/auth/login", {
  body: { email: adminEmail, password: adminPassword },
});
check(login.status === 200, `login do admin (${login.status})`);
const token = login.body.token;
const wsA = login.body.activeWorkspaceId;
check(Boolean(wsA), `workspace ativo retornado no login (${login.body.workspaces.length} disponíveis)`);

const created = await api("POST", "/api/workspaces", {
  token,
  body: { name: `Smoke ${suffix}`, slug: `smoke-${suffix}` },
});
check(created.status === 201, `superadmin cria workspace (${created.status})`);
const wsB = created.body.id;

const formA = await api("POST", "/api/forms", {
  token,
  workspaceId: wsA,
  body: { name: `Form A ${suffix}` },
});
check(formA.status === 201, `cria formulário no workspace A (${formA.status})`);
const formAId = formA.body.id;

const listB = await api("GET", "/api/forms", { token, workspaceId: wsB });
check(
  listB.status === 200 && !listB.body.items.some((item) => item.id === formAId),
  "listagem do workspace B não expõe formulário de A",
);

const crossGet = await api("GET", `/api/forms/${formAId}`, { token, workspaceId: wsB });
check(crossGet.status === 404, `acesso cross-workspace responde 404 (${crossGet.status})`);

const roles = await api("GET", `/api/workspaces/${wsB}/roles`, { token, workspaceId: wsB });
const roleSlugs = (roles.body?.items || []).map((role) => role.slug);
check(
  roles.status === 200 && ["owner", "admin", "editor", "comercial", "leitor"].every((slug) => roleSlugs.includes(slug)),
  `cargos padrão criados: ${roleSlugs.join(", ")}`,
);
const leitor = roles.body.items.find((role) => role.slug === "leitor");

const memberEmail = `leitor+${suffix}@smoke.local`;
const member = await api("POST", `/api/workspaces/${wsB}/members`, {
  token,
  workspaceId: wsB,
  body: { email: memberEmail, name: "Leitor Smoke", roleId: leitor.id },
});
check(member.status === 201 && member.body.temporaryPassword, "membro criado com senha temporária");

const memberLogin = await api("POST", "/api/auth/login", {
  body: { email: memberEmail, password: member.body.temporaryPassword },
});
check(memberLogin.status === 200, `login do membro (${memberLogin.status})`);
const memberToken = memberLogin.body.token;
check(
  memberLogin.body.workspaces.length === 1 && memberLogin.body.workspaces[0].id === wsB,
  "membro só enxerga o workspace onde tem membership",
);

const memberRead = await api("GET", "/api/forms", { token: memberToken, workspaceId: wsB });
check(memberRead.status === 200, `cargo Leitor consegue ler formulários (${memberRead.status})`);

const memberWrite = await api("POST", "/api/forms", {
  token: memberToken,
  workspaceId: wsB,
  body: { name: "Não deveria criar" },
});
check(memberWrite.status === 403, `cargo Leitor bloqueado ao criar formulário (${memberWrite.status})`);

const memberOther = await api("GET", "/api/forms", { token: memberToken, workspaceId: wsA });
check(memberOther.status === 403, `membro sem membership em A recebe 403 (${memberOther.status})`);

const memberSettings = await api("PATCH", "/api/admin/settings", {
  token: memberToken,
  workspaceId: wsB,
  body: { branding: { brandName: "Hack" } },
});
check(memberSettings.status === 403, `cargo Leitor bloqueado ao editar settings (${memberSettings.status})`);

await api("DELETE", `/api/forms/${formAId}`, { token, workspaceId: wsA });

console.log("\nSMOKE OK — isolamento e RBAC validados");
