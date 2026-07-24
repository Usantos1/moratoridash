import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

export function AdminWhatsappPage() {
  const [number, setNumber] = useState("");
  const [template, setTemplate] = useState("");
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);

  async function load() {
    const items = await adminApi.whatsapp();
    setList(items);
    const active = items.find((i) => i.active) || items[0];
    if (active) {
      setNumber(String(active.whatsappNumber || ""));
      setTemplate(String(active.whatsappMessageTemplate || ""));
    }
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await adminApi.saveWhatsapp({
        whatsappNumber: number,
        whatsappMessageTemplate: template,
        active: true,
      });
      toast.success("WhatsApp atualizado");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">WhatsApp comercial</h1>
        <p className="mt-1 text-sm text-white/55">
          Número e template da mensagem final do diagnóstico.
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4 border border-white/10 bg-[#0e1614] p-5">
        <label className="block text-xs uppercase tracking-wide text-white/40">
          Número (com DDI)
          <input
            className="mt-1 w-full border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--leaf)]"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="5511999999999"
            required
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-white/40">
          Template
          <textarea
            className="mt-1 min-h-48 w-full border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--leaf)]"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            required
          />
        </label>
        <p className="text-xs text-white/40">
          Variáveis: {"{nome} {empresa} {email} {telefone} {atendentes} {clientes_dia} {faturamento} {tempo_resposta} {nichos} {origem}"}
        </p>
        <button type="submit" className="bg-[var(--leaf)] px-5 py-2.5 text-sm font-bold text-[#0a140f]">
          Salvar e ativar
        </button>
      </form>

      <div className="text-xs text-white/40">{list.length} configuração(ões) no histórico</div>
    </div>
  );
}
