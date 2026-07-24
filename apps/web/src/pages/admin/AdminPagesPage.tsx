import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
} from "../../components/admin/ui";

type Page = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
  brandName: string | null;
  checkoutUrl: string | null;
  whatsappNumber: string | null;
  primaryColor: string | null;
  gtmId: string | null;
  metaPixelId: string | null;
};

export function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);

  async function load() {
    try {
      setPages((await adminApi.pages()) as unknown as Page[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Páginas de diagnóstico"
        description="Domínio, marca, checkout e pixels — alterações sem redeploy."
      />

      <div className="space-y-4">
        {pages.length === 0 && (
          <p className="text-sm text-white/45">Nenhuma página configurada ainda.</p>
        )}
        {pages.map((page) => (
          <AdminPanel key={page.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{page.name}</h2>
                  {page.active ? (
                    <AdminBadge tone="live">Ativa</AdminBadge>
                  ) : (
                    <AdminBadge>Inativa</AdminBadge>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/45">
                  /{page.slug}
                  {page.domain ? ` · ${page.domain}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="ghost"
                  className="!py-2 text-xs"
                  onClick={async () => {
                    await adminApi.updatePage(page.id, { active: !page.active });
                    toast.success(page.active ? "Desativada" : "Ativada");
                    void load();
                  }}
                >
                  {page.active ? "Desativar" : "Ativar"}
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  className="!py-2 text-xs"
                  onClick={async () => {
                    await adminApi.duplicatePage(page.id);
                    toast.success("Página duplicada");
                    void load();
                  }}
                >
                  Duplicar
                </AdminButton>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InlineField
                label="Marca"
                value={page.brandName || ""}
                onSave={async (brandName) => {
                  await adminApi.updatePage(page.id, { brandName });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <InlineField
                label="Checkout Hotmart"
                value={page.checkoutUrl || ""}
                onSave={async (checkoutUrl) => {
                  await adminApi.updatePage(page.id, { checkoutUrl });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <InlineField
                label="WhatsApp"
                value={page.whatsappNumber || ""}
                onSave={async (whatsappNumber) => {
                  await adminApi.updatePage(page.id, { whatsappNumber });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <InlineField
                label="Meta Pixel ID"
                value={page.metaPixelId || ""}
                onSave={async (metaPixelId) => {
                  await adminApi.updatePage(page.id, { metaPixelId });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <InlineField
                label="GTM ID"
                value={page.gtmId || ""}
                onSave={async (gtmId) => {
                  await adminApi.updatePage(page.id, { gtmId });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <InlineField
                label="Cor primária"
                value={page.primaryColor || "#075e54"}
                onSave={async (primaryColor) => {
                  await adminApi.updatePage(page.id, { primaryColor });
                  toast.success("Salvo");
                  void load();
                }}
              />
            </div>
          </AdminPanel>
        ))}
      </div>
    </div>
  );
}

function InlineField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <AdminField label={label}>
      <div className="flex gap-2">
        <AdminInput value={v} onChange={(e) => setV(e.target.value)} />
        <AdminButton className="shrink-0 !px-3" onClick={() => void onSave(v)}>
          OK
        </AdminButton>
      </div>
    </AdminField>
  );
}
