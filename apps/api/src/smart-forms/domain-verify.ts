import { resolveCname, resolve4 } from "node:dns/promises";

const DEFAULT_TARGET = "app.muratorimkt.com.br";

export type DomainVerifyResult = {
  status: "pending_dns" | "pending_ssl" | "active" | "error";
  ok: boolean;
  message: string;
  records: string[];
};

export async function verifyHostnameDns(
  hostname: string,
  expectedTarget = process.env.SMART_FORM_CNAME_TARGET || DEFAULT_TARGET
): Promise<DomainVerifyResult> {
  const host = hostname.toLowerCase().replace(/\.$/, "").trim();
  const target = expectedTarget.toLowerCase().replace(/\.$/, "").trim();

  try {
    const cnames = await resolveCname(host).catch(() => [] as string[]);
    const normalized = cnames.map((c) => c.toLowerCase().replace(/\.$/, ""));
    if (normalized.some((c) => c === target || c.endsWith(`.${target}`))) {
      return {
        status: "active",
        ok: true,
        message: `CNAME aponta para ${target}`,
        records: normalized,
      };
    }

    // Cloudflare flatten / A record: resolve A e considera pending_ssl se houver IP
    const aRecords = await resolve4(host).catch(() => [] as string[]);
    if (aRecords.length > 0) {
      return {
        status: "pending_ssl",
        ok: true,
        message:
          "Hostname resolve (A), mas CNAME esperado não encontrado. Se usar Cloudflare, deixe nuvem cinza (DNS only) ou confirme o alvo.",
        records: [...normalized, ...aRecords.map((ip) => `A ${ip}`)],
      };
    }

    if (normalized.length > 0) {
      return {
        status: "pending_dns",
        ok: false,
        message: `CNAME atual: ${normalized.join(", ")}. Esperado: ${target}`,
        records: normalized,
      };
    }

    return {
      status: "pending_dns",
      ok: false,
      message: `Sem CNAME/A para ${host}. Configure CNAME → ${target}`,
      records: [],
    };
  } catch (err) {
    return {
      status: "error",
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao consultar DNS",
      records: [],
    };
  }
}
