export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/firebaseAdmin";

export async function DELETE(req, { params }) {
  await db()
    .collection("events")
    .doc(params.id)
    .collection("guests")
    .doc(params.guestId)
    .delete();
  return NextResponse.json({ ok: true });
}
