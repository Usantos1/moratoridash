import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type PublicMeta = {
  formId: string;
  name: string;
  publicSlug: string;
  description?: string | null;
  theme?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  chat?: { messageDelayMs?: number };
};

type PublicNode = {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  placeholder?: string | null;
  required?: boolean;
  options?: Array<{ id: string; label: string; value: string }>;
  isTerminal?: boolean;
  isDisplayOnly?: boolean;
};

type SessionState = {
  sessionToken: string;
  status: string;
  score: number;
  currentNode: PublicNode | null;
  completed: boolean;
  redirectUrl?: string | null;
  temperature?: string;
  alreadyCompleted?: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

function visitorKey(slug: string) {
  const key = `smart-form:visitor:v1:${slug}`;
  let v = localStorage.getItem(key);
  if (!v || v.length < 8) {
    v = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    localStorage.setItem(key, v);
  }
  return v;
}

export function PublicSmartFormPage() {
  const { slug = "" } = useParams();
  const [search] = useSearchParams();
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const primary =
    (meta?.theme?.primaryColor as string) || "#128c7e";

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      try {
        const m = await fetch(`${API_BASE}/api/public/forms/${slug}`).then((r) => {
          if (!r.ok) throw new Error("Formulário não encontrado");
          return r.json();
        });
        setMeta(m);
        const started = await fetch(`${API_BASE}/api/public/forms/${slug}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorKey: visitorKey(slug),
            utmSource: search.get("utm_source") || undefined,
            utmMedium: search.get("utm_medium") || undefined,
            utmCampaign: search.get("utm_campaign") || undefined,
            landingPage: window.location.href,
            referrer: document.referrer || undefined,
          }),
        }).then((r) => r.json());
        setState(started);
        if (started.alreadyCompleted && started.redirectUrl) {
          // keep on page with completed state
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    })();
  }, [slug]);

  async function submit(value?: string | string[] | boolean | null) {
    if (!state || !state.currentNode || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await fetch(`${API_BASE}/api/public/forms/${slug}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: state.sessionToken,
          nodeId: state.currentNode.id,
          answer: value === undefined ? answer : value,
        }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro");
        return data as SessionState;
      });
      setState(next);
      setAnswer("");
      if (next.completed && next.redirectUrl) {
        window.setTimeout(() => {
          window.location.href = next.redirectUrl!;
        }, 1200);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!state?.currentNode?.isDisplayOnly || state.completed) return;
    const t = window.setTimeout(() => {
      void submit(null);
    }, meta?.chat?.messageDelayMs ?? 900);
    return () => clearTimeout(t);
  }, [state?.currentNode?.id, state?.completed]);

  if (error && !meta) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f1f3f6] p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  const node = state?.currentNode;

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-4"
      style={{
        background: (meta?.theme?.pageBackgroundColor as string) || "#e8eef0",
      }}
    >
      <div className="flex h-[min(720px,90dvh)] w-full max-w-[420px] flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-2xl">
        <header
          className="flex items-center gap-3 px-4 py-3 text-white"
          style={{ background: primary }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {(meta?.name || "M").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{meta?.name || "…"}</div>
            <div className="text-xs text-white/75">
              {(meta?.theme?.headerSubtitle as string) || "online"}
            </div>
          </div>
        </header>

        <div
          className="flex-1 space-y-3 overflow-y-auto p-4"
          style={{
            background: (meta?.theme?.backgroundColor as string) || "#ece5dd",
          }}
        >
          {node && (
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-[14px] leading-snug text-[#111B21] shadow-sm">
              <div className="font-medium">{node.title}</div>
              {node.description ? (
                <div className="mt-1 text-[13px] text-[#54656f]">{node.description}</div>
              ) : null}
            </div>
          )}
          {state?.completed && (
            <div className="rounded-xl bg-white/90 px-3 py-2 text-center text-sm font-semibold text-foreground">
              {(meta?.theme?.completionBannerText as string) || "Formulário concluído"}
              {state.temperature ? ` · ${state.temperature}` : ""}
            </div>
          )}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        {!state?.completed && node && !node.isDisplayOnly && (
          <div className="border-t border-black/5 bg-white p-3">
            {node.options?.length ? (
              <div className="flex flex-col gap-2">
                {node.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void submit(o.value)}
                    className="rounded-full border border-black/10 px-3 py-2.5 text-left text-sm font-medium hover:border-black/25"
                    style={{ borderColor: `${primary}55` }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <input
                  className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-black/30"
                  placeholder={node.placeholder || "Digite…"}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                  style={{ background: primary }}
                >
                  ✈
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
