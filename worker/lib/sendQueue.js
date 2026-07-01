const { db } = require("./firebaseAdmin");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs() {
  const min = Number(process.env.MIN_DELAY_SECONDS || 4);
  const max = Number(process.env.MAX_DELAY_SECONDS || 10);
  const seconds = Math.random() * (max - min) + min;
  return Math.round(seconds * 1000);
}

async function processQueue(sock) {
  const batchSize = Number(process.env.BATCH_SIZE || 15);
  const nowIso = new Date().toISOString();

  const snap = await db()
    .collection("queue")
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", nowIso)
    .orderBy("scheduledAt", "asc")
    .limit(batchSize)
    .get();

  if (snap.empty) return;

  console.log(`[queue] Memproses ${snap.size} pesan...`);

  for (const doc of snap.docs) {
    const item = doc.data();
    const jid = `${item.phone}@s.whatsapp.net`;

    try {
      await db().collection("queue").doc(doc.id).set({ status: "processing" }, { merge: true });

      await sock.sendMessage(jid, { text: item.message });

      await db().collection("queue").doc(doc.id).set(
        { status: "sent", sentAt: new Date().toISOString() },
        { merge: true }
      );

      if (item.guestId && item.eventId) {
        const guestRef = db()
          .collection("events")
          .doc(item.eventId)
          .collection("guests")
          .doc(item.guestId);

        if (item.type === "invitation") {
          await guestRef.set(
            { status: "sent", invitationSentAt: new Date().toISOString() },
            { merge: true }
          );
        } else if (item.type === "reminder") {
          const { FieldValue } = require("firebase-admin/firestore");
          await guestRef.set(
            {
              lastReminderSentAt: new Date().toISOString(),
              reminderCount: FieldValue.increment(1),
            },
            { merge: true }
          );
        }
      }

      console.log(`[queue] Terkirim ke ${item.phone} (${item.type})`);
    } catch (err) {
      console.error(`[queue] Gagal kirim ke ${item.phone}:`, err.message);
      const attempts = (item.attempts || 0) + 1;
      await db()
        .collection("queue")
        .doc(doc.id)
        .set(
          {
            status: attempts >= 3 ? "failed" : "pending",
            attempts,
            error: err.message,
          },
          { merge: true }
        );

      if (attempts >= 3 && item.guestId && item.eventId && item.type === "invitation") {
        await db()
          .collection("events")
          .doc(item.eventId)
          .collection("guests")
          .doc(item.guestId)
          .set({ status: "failed" }, { merge: true });
      }
    }

    await sleep(randomDelayMs());
  }
}

module.exports = { processQueue };
