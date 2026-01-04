"use server";

import { updateUser } from "@/app/lib/userStore";
import { revalidatePath } from "next/cache";

export async function updateProfileImage(userId: string, imageUrl: string) {
  const updated = updateUser(userId, { profileImageUrl: imageUrl });
  if (!updated) {
    throw new Error("Errore durante l'aggiornamento dell'immagine profilo");
  }
  // Revalidate le pagine che mostrano il profilo
  revalidatePath("/app/host");
  revalidatePath("/app/tech");
  revalidatePath("/app/tech/users");
  return updated;
}

export async function removeProfileImage(userId: string) {
  const updated = updateUser(userId, { profileImageUrl: undefined });
  if (!updated) {
    throw new Error("Errore durante la rimozione dell'immagine profilo");
  }
  // Revalidate le pagine che mostrano il profilo
  revalidatePath("/app/host");
  revalidatePath("/app/tech");
  revalidatePath("/app/tech/users");
  return updated;
}

