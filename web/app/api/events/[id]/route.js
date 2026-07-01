export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebaseAdmin";

function normalizePhone(raw) {
  let p = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (!p.startsWith("62")) p = "62" + p;
  return p;
}

export async function GET(req, { params }) {
  const snap = await db()
    .collection("events")
    .doc(params.id)
    .collection("guests")
    .orderBy("name", "asc")
    .get();
  const guests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ guests });
}

// body: { guests: [{ name, phone }, ...] }
export async function POST(req, { params }) {
  const body = await req.json();
  const list = Array.isArray(body.guests) ? body.guests : [];

  if (list.length === 0) {
    return NextResponse.json({ error: "Tidak ada data tamu." }, { status: 400 });
  }

  const batch = db().batch();
  const guestsRef = db().collection("events").doc(params.id).collection("guests");

  let added = 0;
  for (const g of list) {
    if (!g.name || !g.phone) continue;
    const ref = guestsRef.doc();
    batch.set(ref, {
      name: g.name.trim(),
      phone: normalizePhone(g.phone),
      status: "draft",
      rsvp: "pending",
      invitationSentAt: null,
      lastReminderSentAt: null,
      reminderCount: 0,
      createdAt: new Date().toISOString(),
    });
    added++;
  }

  if (added === 0) {
    return NextResponse.json({ error: "Semua baris tidak valid." }, { status: 400 });
  }

  await batch.commit();
  return NextResponse.json({ added });
}
