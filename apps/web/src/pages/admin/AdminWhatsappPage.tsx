import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "../../components/admin/ui";

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
    <div className="space-y-8">
      <AdminPageHeader
        title="WhatsApp comercial"
        description="Número e template da mensagem final do diagnóstico."
      />

      <form onSubmit={onSubmit} className="max-w-2xl">
        <AdminPanel>
          <div className="space-y-4">
            <AdminField label="Número (com DDI)" hint="Ex.: 5511999999999">
              <AdminInput
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="5511999999999"
                required
              />
            </AdminField>
            <AdminField
              label="Template"
              hint="{nome} {empresa} {email} {telefone} {atendentes} {clientes_dia} {faturamento} {tempo_resposta} {nichos} {origem}"
            >
              <AdminTextarea
                className="min-h-48"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                required
              />
            </AdminField>
            <AdminButton type="submit" className="!py-3">
              Salvar e ativar
            </AdminButton>
          </div>
        </AdminPanel>
      </form>

      <p className="text-xs text-white/35">{list.length} configuração(ões) no histórico</p>
    </div>
  );
}
