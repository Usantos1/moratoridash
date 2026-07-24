import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Páginas de diagnóstico</h1>
        <p className="mt-1 text-sm text-white/55">
          Domínio, marca, checkout e pixels — sem redeploy.
        </p>
      </div>

      <div className="space-y-4">
        {pages.map((page) => (
          <div key={page.id} className="border border-white/10 bg-[#0e1614] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{page.name}</h2>
                <p className="mt-1 text-sm text-white/50">
                  /{page.slug}
                  {page.domain ? ` · ${page.domain}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="border border-white/15 px-3 py-1.5 text-xs"
                  onClick={async () => {
                    await adminApi.updatePage(page.id, { active: !page.active });
                    toast.success(page.active ? "Desativada" : "Ativada");
                    void load();
                  }}
                >
                  {page.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  className="border border-white/15 px-3 py-1.5 text-xs"
                  onClick={async () => {
                    await adminApi.duplicatePage(page.id);
                    toast.success("Página duplicada");
                    void load();
                  }}
                >
                  Duplicar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field
                label="Marca"
                value={page.brandName || ""}
                onSave={async (brandName) => {
                  await adminApi.updatePage(page.id, { brandName });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <Field
                label="Checkout Hotmart"
                value={page.checkoutUrl || ""}
                onSave={async (checkoutUrl) => {
                  await adminApi.updatePage(page.id, { checkoutUrl });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <Field
                label="WhatsApp"
                value={page.whatsappNumber || ""}
                onSave={async (whatsappNumber) => {
                  await adminApi.updatePage(page.id, { whatsappNumber });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <Field
                label="Meta Pixel ID"
                value={page.metaPixelId || ""}
                onSave={async (metaPixelId) => {
                  await adminApi.updatePage(page.id, { metaPixelId });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <Field
                label="GTM ID"
                value={page.gtmId || ""}
                onSave={async (gtmId) => {
                  await adminApi.updatePage(page.id, { gtmId });
                  toast.success("Salvo");
                  void load();
                }}
              />
              <Field
                label="Cor primária"
                value={page.primaryColor || "#075e54"}
                onSave={async (primaryColor) => {
                  await adminApi.updatePage(page.id, { primaryColor });
                  toast.success("Salvo");
                  void load();
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
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
    <label className="block text-xs uppercase tracking-wide text-white/40">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[var(--leaf)]"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
        <button
          type="button"
          className="bg-[var(--leaf)] px-3 text-xs font-bold text-[#0a140f]"
          onClick={() => void onSave(v)}
        >
          OK
        </button>
      </div>
    </label>
  );
}
