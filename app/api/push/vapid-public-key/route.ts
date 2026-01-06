import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/app/lib/vapidKeys";

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (error: any) {
    console.error("[push/vapid-public-key] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

