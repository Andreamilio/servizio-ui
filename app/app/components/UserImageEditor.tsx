"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfileImage, removeProfileImage } from "./userProfileActions";

type UserImageEditorProps = {
  userId: string;
  username: string;
  currentImageUrl?: string;
};

export function UserImageEditor({ userId, username, currentImageUrl }: UserImageEditorProps) {
  const [profileImage, setProfileImage] = useState<string | null>(currentImageUrl || null);
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
    } catch (error) {
      console.error("Error removing profile image:", error);
      alert("Errore durante la rimozione dell'immagine");
    } finally {
      setRemovingImage(false);
    }
  }

  const hasUnsavedChanges = profileImage !== currentImageUrl;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium mb-2">Immagine Profilo</div>
      
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
              <span className="text-xl font-semibold text-cyan-200">
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
            {profileImage ? "Cambia immagine" : "Carica immagine"}
          </button>
          
          {hasUnsavedChanges && profileImage && (
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={savingImage}
              className="block w-full rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {savingImage ? "Salvataggio..." : "Salva immagine"}
            </button>
          )}
          
          {(currentImageUrl || profileImage) && (
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
  );
}

