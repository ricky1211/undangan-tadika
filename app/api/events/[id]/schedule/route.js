export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebaseAdmin";

function renderTemplate(template, event, guest) {
  const dateFmt = new Date(event.date).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
  return template
    .replaceAll("{{name}}", guest.name)
    .replaceAll("{{event_name}}", event.name)
    .replaceAll("{{date}}", dateFmt)
    .replaceAll("{{location}}", event.location || "-");
}

// body: { scheduledAt: ISOstring|null, guestIds: string[] }
export async function POST(req, { params }) {
  const body = await req.json();
  const { scheduledAt, guestIds } = body;

  const eventDoc = await db().collection("events").doc(params.id).get();
  if (!eventDoc.exists) {
    return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });
  }
  const event = { id: eventDoc.id, ...eventDoc.data() };

  if (!Array.isArray(guestIds) || guestIds.length === 0) {
    return NextResponse.json({ error: "Pilih minimal satu tamu." }, { status: 400 });
  }

  const guestsRef = db().collection("events").doc(params.id).collection("guests");
  const batch = db().batch();
  const sendAt = scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString();

  let count = 0;
  for (const gid of guestIds) {
    const gSnap = await guestsRef.doc(gid).get();
    if (!gSnap.exists) continue;
    const guest = { id: gSnap.id, ...gSnap.data() };

    const message = renderTemplate(event.inviteTemplate, event, guest);

    const queueRef = db().collection("queue").doc();
    batch.set(queueRef, {
      eventId: event.id,
      guestId: guest.id,
      phone: guest.phone,
      message,
      type: "invitation",
      scheduledAt: sendAt,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
    batch.set(guestsRef.doc(gid), { status: "queued" }, { merge: true });
    count++;
  }

  await batch.commit();
  return NextResponse.json({ queued: count, scheduledAt: sendAt });
}
