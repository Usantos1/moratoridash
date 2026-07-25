import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import { useSession } from "../../lib/session-context";
import { assetSrc } from "../../lib/asset-url";
import { AdminBadge, AdminButton, AdminField, AdminInput } from "../admin/ui";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileModal({ open, onClose }: Props) {
  const { user, workspace, reload } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user.name ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open, user.name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const initial = (user.name || user.email || "M")[0].toUpperCase();
  const avatar = assetSrc(user.avatarUrl);

  async function saveName() {
    if (name.trim().length < 2) {
      toast.error("Informe seu nome completo");
      return;
    }
    setSavingName(true);
    try {
      await adminApi.updateProfile({ name: name.trim() });
      await reload();
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar perfil");
    } finally {
      setSavingName(false);
    }
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Máx. 4 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      await adminApi.uploadAvatar(dataUrl);
      await reload();
      toast.success("Foto atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      await adminApi.updateProfile({ avatarUrl: null });
      await reload();
      toast.success("Foto removida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover foto");
    } finally {
      setUploading(false);
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      toast.error("A nova senha precisa de ao menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    try {
      await adminApi.updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="relative z-10 flex max-h-[min(880px,92dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[0_24px_80px_rgba(16,24,40,0.28)] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="profile-modal-title" className="text-lg font-bold text-foreground">
              Meu perfil
            </h2>
            <p className="text-xs text-muted-foreground">Foto, nome e senha de acesso</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Foto
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-brand-600 ring-1 ring-border">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton
                  className="!px-3 !py-2 text-xs"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Enviando…" : avatar ? "Trocar foto" : "Enviar foto"}
                </AdminButton>
                {avatar && (
                  <AdminButton
                    variant="ghost"
                    className="!px-3 !py-2 text-xs"
                    onClick={() => void removeAvatar()}
                    disabled={uploading}
                  >
                    Remover
                  </AdminButton>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void uploadAvatar(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">PNG, JPG ou WebP · máx. 4 MB</p>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Dados
              </span>
              {workspace?.role && <AdminBadge tone="live">{workspace.role.name}</AdminBadge>}
              {user.isSuperAdmin && <AdminBadge tone="success">Superadmin</AdminBadge>}
            </div>
            <div className="grid gap-3">
              <AdminField label="Nome">
                <AdminInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </AdminField>
              <AdminField label="E-mail">
                <AdminInput value={user.email} disabled />
              </AdminField>
            </div>
            <div className="mt-3">
              <AdminButton
                className="!px-3 !py-2 text-xs"
                onClick={() => void saveName()}
                disabled={savingName}
              >
                {savingName ? "Salvando…" : "Salvar nome"}
              </AdminButton>
            </div>
          </section>

          <section>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Senha
            </div>
            <div className="grid gap-3">
              <AdminField label="Senha atual">
                <AdminInput
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </AdminField>
              <AdminField label="Nova senha">
                <AdminInput
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </AdminField>
              <AdminField label="Confirmar nova senha">
                <AdminInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </AdminField>
            </div>
            <div className="mt-3">
              <AdminButton
                className="!px-3 !py-2 text-xs"
                onClick={() => void savePassword()}
                disabled={savingPassword || !currentPassword || !newPassword}
              >
                {savingPassword ? "Alterando…" : "Alterar senha"}
              </AdminButton>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
