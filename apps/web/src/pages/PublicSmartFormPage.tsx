import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { formatPhoneBr, onlyDigits } from "../lib/smart-forms/phone-mask";
import { darkenHex } from "../lib/qualification/chat-theme";

type PublicMeta = {
  formId: string;
  name: string;
  publicSlug: string;
  description?: string | null;
  theme?: Record<string, unknown>;
  seo?: { title?: string; description?: string; ogImage?: string };
  chat?: { messageDelayMs?: number; returnRedirectUrl?: string | null };
  tracking?: Record<string, unknown>;
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
  redirectUrl?: string | null;
  bannerText?: string | null;
};

type SessionState = {
  sessionToken: string;
  status: string;
  score: number;
  currentNode: PublicNode | null;
  completed: boolean;
  redirectUrl?: string | null;
  returnRedirectUrl?: string | null;
  temperature?: string;
  alreadyCompleted?: boolean;
  leadId?: string;
};

type Bubble = { id: string; role: "bot" | "user" | "system"; text: string };

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

function completedCacheKey(slug: string) {
  return `smart-form:completed:v1:${slug}`;
}

function nodeText(node: PublicNode) {
  return [node.title, node.description].filter(Boolean).join("\n");
}

function formatUserAnswer(value: unknown, node: PublicNode) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    return value
      .map((v) => node.options?.find((o) => o.value === v)?.label || String(v))
      .join(", ");
  }
  const opt = node.options?.find((o) => o.value === String(value));
  return opt?.label || String(value);
}

export function PublicSmartFormPage() {
  const { slug = "" } = useParams();
  const [search] = useSearchParams();
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [answer, setAnswer] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const seenNodes = useRef<Set<string>>(new Set());
  const delay = meta?.chat?.messageDelayMs ?? 900;

  const primary = (meta?.theme?.primaryColor as string) || "#128C7E";
  const primaryDark = darkenHex(primary);
  const pageBg =
    (meta?.theme?.pageBackgroundColor as string) || "var(--sf-page-bg-light)";
  const chatBg =
    (meta?.theme?.backgroundColor as string) || "var(--sf-chat-bg-light)";
  const usePattern = meta?.theme?.chatWallpaperPattern !== false;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing, state?.currentNode?.id]);

  useEffect(() => {
    if (!meta) return;
    const title = meta.seo?.title || meta.name;
    document.title = title;
    const desc = meta.seo?.description || meta.description || "";
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", desc);
  }, [meta]);

  function pushBot(node: PublicNode) {
    if (seenNodes.current.has(node.id)) return;
    seenNodes.current.add(node.id);
    setBubbles((prev) => [
      ...prev,
      { id: `b-${node.id}-${Date.now()}`, role: "bot", text: nodeText(node) },
    ]);
  }

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const m: PublicMeta = await fetch(`${API_BASE}/api/public/forms/${slug}`).then(
          (r) => {
            if (!r.ok) throw new Error("Formulário não encontrado ou não publicado");
            return r.json();
          }
        );
        if (cancelled) return;
        setMeta(m);

        const cacheRaw = localStorage.getItem(completedCacheKey(slug));
        if (cacheRaw) {
          try {
            const cache = JSON.parse(cacheRaw) as {
              expiresAt: number;
              redirectUrl?: string;
            };
            if (cache.expiresAt > Date.now()) {
              // still start to get server state / alreadyCompleted
            }
          } catch {
            /* ignore */
          }
        }

        const started: SessionState = await fetch(
          `${API_BASE}/api/public/forms/${slug}/start`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitorKey: visitorKey(slug),
              utmSource: search.get("utm_source") || undefined,
              utmMedium: search.get("utm_medium") || undefined,
              utmCampaign: search.get("utm_campaign") || undefined,
              utmTerm: search.get("utm_term") || undefined,
              utmContent: search.get("utm_content") || undefined,
              gclid: search.get("gclid") || undefined,
              fbclid: search.get("fbclid") || undefined,
              landingPage: window.location.href,
              referrer: document.referrer || undefined,
              deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
            }),
          }
        ).then((r) => r.json());

        if (cancelled) return;
        setState(started);
        if (started.currentNode) {
          setTyping(true);
          window.setTimeout(() => {
            if (cancelled) return;
            setTyping(false);
            pushBot(started.currentNode!);
          }, Math.min(delay, 700));
        }
        if (started.alreadyCompleted && started.returnRedirectUrl) {
          setBubbles([
            {
              id: "done",
              role: "system",
              text: "Você já concluiu este formulário recentemente.",
            },
          ]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submit(value?: string | string[] | boolean | null) {
    if (!state || !state.currentNode || busy || state.completed) return;
    const node = state.currentNode;
    const payload =
      value === undefined
        ? node.type === "phone"
          ? onlyDigits(answer)
          : node.type === "multiple_choice"
            ? multi
            : answer
        : value;

    if (
      node.required !== false &&
      !node.isDisplayOnly &&
      (payload == null ||
        payload === "" ||
        (Array.isArray(payload) && payload.length === 0))
    ) {
      setError("Preencha para continuar");
      return;
    }

    setBusy(true);
    setError(null);

    if (!node.isDisplayOnly) {
      setBubbles((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          text: formatUserAnswer(payload, node),
        },
      ]);
    }

    try {
      const next: SessionState = await fetch(
        `${API_BASE}/api/public/forms/${slug}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: state.sessionToken,
            nodeId: node.id,
            answer: payload,
          }),
        }
      ).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Resposta inválida");
        return data;
      });

      setState(next);
      setAnswer("");
      setMulti([]);

      if (next.completed) {
        localStorage.setItem(
          completedCacheKey(slug),
          JSON.stringify({
            completedAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            redirectUrl: next.redirectUrl || null,
          })
        );
        const banner =
          next.currentNode?.bannerText ||
          (meta?.theme?.completionBannerText as string) ||
          "Formulário concluído";
        setBubbles((prev) => [
          ...prev,
          ...(next.currentNode && !seenNodes.current.has(next.currentNode.id)
            ? [
                {
                  id: `b-end-${Date.now()}`,
                  role: "bot" as const,
                  text: nodeText(next.currentNode),
                },
              ]
            : []),
          {
            id: `sys-${Date.now()}`,
            role: "system",
            text: `${banner}${next.temperature ? ` · ${next.temperature}` : ""}`,
          },
        ]);
        if (next.currentNode) seenNodes.current.add(next.currentNode.id);
        if (next.redirectUrl) {
          window.setTimeout(() => {
            window.location.href = next.redirectUrl!;
          }, 1400);
        }
      } else if (next.currentNode) {
        setTyping(true);
        window.setTimeout(() => {
          setTyping(false);
          pushBot(next.currentNode!);
        }, delay);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  // auto-advance display-only (message + confirmation/redirect)
  useEffect(() => {
    const node = state?.currentNode;
    if (!node || state?.completed || busy) return;
    if (node.isDisplayOnly || node.type === "message" || node.type === "confirmation" || node.type === "redirect") {
      const t = window.setTimeout(() => void submit(null), delay);
      return () => clearTimeout(t);
    }
  }, [state?.currentNode?.id, state?.completed, busy]);

  if (error && !meta) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f1f3f6] p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Publique o formulário no admin para liberar o link público.
          </p>
        </div>
      </div>
    );
  }

  const node = state?.currentNode;
  const choiceTypes = ["buttons", "single_choice", "multiple_choice", "scale", "rating"];
  const isChoice = node && choiceTypes.includes(node.type) && node.options?.length;
  const isLgpd = node?.type === "lgpd";

  return (
    <div
      className="flex min-h-dvh items-stretch justify-center sm:items-center sm:p-4"
      style={{ background: pageBg }}
    >
      <div
        className="flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-white sm:h-[min(780px,92dvh)] sm:rounded-[var(--sf-radius-phone)] sm:border sm:border-black/10 sm:shadow-[var(--sf-shadow-phone)]"
        style={{ fontFamily: "var(--sf-font)" }}
      >
        <header
          className="flex items-center gap-3 px-4 py-3 text-white shadow-[var(--sf-shadow-header)]"
          style={{
            background: `linear-gradient(180deg, ${primary}, ${primaryDark})`,
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {(meta?.name || "M").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">
              {meta?.name || "…"}
            </div>
            <div className="text-[11px] text-[var(--sf-header-subtitle)]">
              {(meta?.theme?.headerSubtitle as string) || "online"}
            </div>
          </div>
        </header>

        <div
          ref={scroller}
          className="relative flex-1 space-y-2 overflow-y-auto px-3 py-4"
          style={{
            background: chatBg,
            backgroundImage: usePattern
              ? "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04) 1px, transparent 1px)"
              : undefined,
            backgroundSize: usePattern ? "18px 18px" : undefined,
          }}
        >
          <div className="mx-auto mb-3 w-fit rounded-full bg-[var(--sf-date-chip-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--sf-date-chip-text)]">
            Hoje
          </div>

          {bubbles.map((b) =>
            b.role === "system" ? (
              <div
                key={b.id}
                className="mx-auto max-w-[90%] rounded-xl bg-white/90 px-3 py-2 text-center text-[12px] font-semibold text-[var(--sf-bubble-text)] shadow-sm"
              >
                {b.text}
              </div>
            ) : (
              <div
                key={b.id}
                className={`flex ${b.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap px-3.5 py-2 text-[14px] leading-snug shadow-[var(--sf-shadow-bubble)] ${
                    b.role === "user"
                      ? "rounded-[var(--sf-radius-bubble)] rounded-br-[var(--sf-radius-bubble-tail)] bg-[var(--sf-bubble-user-bg)] text-[var(--sf-bubble-text)]"
                      : "rounded-[var(--sf-radius-bubble)] rounded-bl-[var(--sf-radius-bubble-tail)] bg-[var(--sf-bubble-bot-bg)] text-[var(--sf-bubble-text)]"
                  }`}
                >
                  {b.text}
                </div>
              </div>
            )
          )}

          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sf-typing-dot)]"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {error ? (
            <p className="text-center text-xs text-[var(--sf-error)]">{error}</p>
          ) : null}

          {state?.alreadyCompleted && state.returnRedirectUrl && (
            <a
              href={state.returnRedirectUrl}
              className="mx-auto block w-fit rounded-full px-4 py-2 text-xs font-semibold text-white"
              style={{ background: primary }}
            >
              Continuar
            </a>
          )}
        </div>

        {!state?.completed && node && !node.isDisplayOnly && !typing && (
          <div className="border-t border-black/5 bg-[var(--sf-composer-bg)] p-3 backdrop-blur">
            {isLgpd ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit(true)}
                className="w-full rounded-[var(--sf-radius-option)] bg-white px-3 py-3 text-left text-sm font-medium shadow-sm"
              >
                ✓ Concordo com o tratamento dos dados (LGPD)
              </button>
            ) : isChoice && node.type === "multiple_choice" ? (
              <div className="space-y-2">
                {node.options!.map((o) => {
                  const on = multi.includes(o.value);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setMulti((prev) =>
                          on ? prev.filter((x) => x !== o.value) : [...prev, o.value]
                        )
                      }
                      className={`w-full rounded-[var(--sf-radius-option)] border px-3 py-2.5 text-left text-sm font-medium ${
                        on ? "border-transparent text-white" : "border-black/10 bg-white"
                      }`}
                      style={on ? { background: primary } : undefined}
                    >
                      {o.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={busy || multi.length === 0}
                  onClick={() => void submit(multi)}
                  className="w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: primary }}
                >
                  Continuar
                </button>
              </div>
            ) : isChoice ? (
              <div className="flex flex-col gap-2">
                {node.options!.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void submit(o.value)}
                    className="rounded-[var(--sf-radius-option)] border border-black/10 bg-white px-3 py-2.5 text-left text-sm font-medium shadow-sm hover:border-black/20"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <input
                  className="min-w-0 flex-1 rounded-[var(--sf-radius-input)] border-0 bg-[var(--sf-input-bg)] px-4 py-3 text-sm outline-none ring-1 ring-black/5 placeholder:text-[var(--sf-input-placeholder)]"
                  placeholder={node.placeholder || "Digite…"}
                  value={answer}
                  inputMode={
                    node.type === "phone" || node.type === "number"
                      ? "tel"
                      : node.type === "email"
                        ? "email"
                        : "text"
                  }
                  onChange={(e) =>
                    setAnswer(
                      node.type === "phone"
                        ? formatPhoneBr(e.target.value)
                        : e.target.value
                    )
                  }
                  disabled={busy}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="Enviar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md disabled:opacity-50"
                  style={{ background: primary }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
