import { useEffect, useState } from "react";
import type { FormSettings, SmartFormDefinition } from "../../lib/smart-forms/types";
import {
  answerDraft,
  currentNode,
  isDisplayOnly,
  startDraft,
  type DraftSession,
} from "../../lib/smart-forms/draft-engine";
import { formatPhoneBr, onlyDigits } from "../../lib/smart-forms/phone-mask";

type Props = {
  definition: SmartFormDefinition;
  formName: string;
  primaryColor: string;
  settings: FormSettings;
};

export function DraftSimulator({
  definition,
  formName,
  primaryColor,
  settings,
}: Props) {
  const [session, setSession] = useState<DraftSession>(() => startDraft(definition));
  const [input, setInput] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const node = currentNode(definition, session);
  const subtitle = settings.theme?.headerSubtitle || "prévia";

  useEffect(() => {
    setSession(startDraft(definition));
    setInput("");
    setMulti([]);
  }, [definition]);

  useEffect(() => {
    if (!node || session.completed) return;
    if (node.type === "message" || (isDisplayOnly(node.type) && node.type !== "confirmation" && node.type !== "redirect")) {
      const t = window.setTimeout(() => {
        setSession((s) => answerDraft(definition, s, null));
      }, settings.chat?.messageDelayMs ?? 600);
      return () => clearTimeout(t);
    }
  }, [node?.id, session.completed, definition]);

  function send(value?: string | string[] | boolean | null) {
    if (!node || session.completed) return;
    const payload =
      value !== undefined
        ? value
        : node.type === "phone"
          ? onlyDigits(input)
          : node.type === "multiple_choice"
            ? multi
            : input;
    setSession((s) => answerDraft(definition, s, payload));
    setInput("");
    setMulti([]);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Simulador do chat</h3>
        <button
          type="button"
          className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-semibold hover:border-primary/40"
          onClick={() => {
            setSession(startDraft(definition));
            setInput("");
            setMulti([]);
          }}
        >
          Reiniciar
        </button>
      </div>

      <div className="mx-auto flex h-[560px] w-[280px] flex-col overflow-hidden rounded-[1.85rem] border-[6px] border-[#1a1a1a] bg-[#0b141a] shadow-xl">
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-white"
          style={{ background: primaryColor }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {(formName || "M").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold">{formName}</div>
            <div className="text-[10px] text-white/75">{subtitle}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <div className="mx-auto w-fit rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
            Hoje
          </div>
          {session.transcript.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12px] leading-snug ${
                  m.role === "user"
                    ? "rounded-br-sm bg-[#dcf8c6] text-[#111B21]"
                    : "rounded-bl-sm bg-white text-[#111B21]"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {session.completed && (
            <div className="rounded-xl bg-white/90 px-2 py-1.5 text-center text-[11px] font-semibold text-[#111B21]">
              Concluído · score {session.score}
            </div>
          )}
        </div>

        {!session.completed && node && !isDisplayOnly(node.type) && (
          <div className="shrink-0 border-t border-white/10 bg-[#1a1a1a] p-2">
            {node.type === "lgpd" ? (
              <button
                type="button"
                className="w-full rounded-xl bg-white px-2 py-2 text-left text-[11px] font-medium"
                onClick={() => send(true)}
              >
                ✓ Concordo (LGPD)
              </button>
            ) : node.options?.length && node.type === "multiple_choice" ? (
              <div className="space-y-1.5">
                {node.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] ${
                      multi.includes(o.value) ? "text-white" : "bg-white text-[#111]"
                    }`}
                    style={
                      multi.includes(o.value) ? { background: primaryColor } : undefined
                    }
                    onClick={() =>
                      setMulti((p) =>
                        p.includes(o.value)
                          ? p.filter((x) => x !== o.value)
                          : [...p, o.value]
                      )
                    }
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full rounded-full py-1.5 text-[11px] font-semibold text-white"
                  style={{ background: primaryColor }}
                  onClick={() => send(multi)}
                >
                  Continuar
                </button>
              </div>
            ) : node.options?.length ? (
              <div className="space-y-1.5">
                {node.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="w-full rounded-lg bg-white px-2 py-1.5 text-left text-[11px]"
                    onClick={() => send(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  className="min-w-0 flex-1 rounded-full bg-white px-3 py-1.5 text-[11px] outline-none"
                  placeholder={node.placeholder || "Digite…"}
                  value={input}
                  onChange={(e) =>
                    setInput(
                      node.type === "phone"
                        ? formatPhoneBr(e.target.value)
                        : e.target.value
                    )
                  }
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                  style={{ background: primaryColor }}
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
