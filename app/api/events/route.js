export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin";

export async function GET() {
  const snap = await db().collection("events").orderBy("date", "asc").get();
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ events });
}

export async function POST(req) {
  const body = await req.json();
  const { name, date, location, description, inviteTemplate, reminderTemplate, reminderConfig } = body;

  if (!name || !date) {
    return NextResponse.json({ error: "Nama acara dan tanggal wajib diisi." }, { status: 400 });
  }

  const docRef = await db().collection("events").add({
    name,
    date, // ISO string, contoh: 2026-08-20T10:00:00+07:00
    location: location || "",
    description: description || "",
    inviteTemplate:
      inviteTemplate ||
      "Halo {{name}}, kami mengundang Anda ke {{event_name}} pada {{date}} di {{location}}. Mohon konfirmasi kehadiran ya. Terima kasih!",
    reminderTemplate:
      reminderTemplate ||
      "Halo {{name}}, ini pengingat untuk acara {{event_name}} pada {{date}} di {{location}}. Sampai jumpa!",
    reminderConfig: reminderConfig || { enabled: true, startDaysBefore: 5, intervalDays: 1 },
    reminderSentDates: [],
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: docRef.id });
}
