export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export async function GET() {
  const doc = await db().collection("system").doc("whatsapp").get();
  if (!doc.exists) {
    return NextResponse.json({ status: "unknown", qr: null, phoneNumber: null, updatedAt: null });
  }
  return NextResponse.json(doc.data());
}
