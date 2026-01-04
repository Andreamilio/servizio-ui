"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfileImage, removeProfileImage } from "./userProfileActions";

type UserProfileModalProps = {
  userId: string;
  username: string;
  role: "host" | "tech";
  profileImageUrl?: string;
  onClose: () => void;
};

export function UserProfileModal({
  userId,
  username,
  role,
  profileImageUrl,
  onClose,
}: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(profileImageUrl || null);
  const [savingImage, setSavingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      // 2MB limit
      alert("L'immagine deve essere inferiore a 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileImage(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveImage() {
    if (!profileImage) return;
    setSavingImage(true);
    try {
      await updateProfileImage(userId, profileImage);
      // Use router.refresh() instead of window.location.reload() to avoid hydration issues
      router.refresh();
      // Close modal after a short delay to allow refresh
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error("Error saving profile image:", error);
      alert("Errore durante il salvataggio dell'immagine");
    } finally {
      setSavingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!confirm("Sei sicuro di voler rimuovere l'immagine profilo?")) {
      return;
    }
    setRemovingImage(true);
    try {
      await removeProfileImage(userId);
      setProfileImage(null);
      // Use router.refresh() instead of window.location.reload() to avoid hydration issues
      router.refresh();
      // Close modal after a short delay to allow refresh
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error("Error removing profile image:", error);
      alert("Errore durante la rimozione dell'immagine");
    } finally {
      setRemovingImage(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Le password non corrispondono");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setPasswordError(data.error || "Errore durante il cambio password");
        return;
      }

      setPasswordSuccess("Password aggiornata con successo");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Errore durante il cambio password");
    } finally {
      setChangingPassword(false);
    }
  }

  const roleLabel = role === "host" ? "Host" : "Tech";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0a0d12] border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-semibold">Profilo Utente</div>
              <div className="text-sm opacity-70">{username} • {roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Profile Image Section */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="text-sm font-medium mb-3">Immagine Profilo</div>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400/30 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-cyan-200">
                      {getInitials(username)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="block w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold"
                >
                  Cambia immagine
                </button>
                {profileImage && profileImage !== profileImageUrl && (
                  <button
                    type="button"
                    onClick={handleSaveImage}
                    disabled={savingImage}
                    className="block w-full rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {savingImage ? "Salvataggio..." : "Salva immagine"}
                  </button>
                )}
                {(profileImageUrl || profileImage) && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={removingImage || savingImage}
                    className="block w-full rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {removingImage ? "Rimozione..." : "Rimuovi immagine"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Info (Read-only) */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="text-sm font-medium mb-3">Informazioni Utente</div>
            <div className="space-y-2">
              <div>
                <div className="text-xs opacity-60 mb-1">Username</div>
                <div className="text-sm opacity-90">{username}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 mb-1">Ruolo</div>
                <div className="text-sm opacity-90">{roleLabel}</div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div>
            <div className="text-sm font-medium mb-3">Cambia Password</div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-sm text-red-200">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-sm text-emerald-200">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm opacity-70 mb-2">Password corrente</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm opacity-70 mb-2">Nuova password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm opacity-70 mb-2">Conferma nuova password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold"
                >
                  Chiudi
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {changingPassword ? "Aggiornamento..." : "Cambia password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

