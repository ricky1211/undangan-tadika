const { db } = require("./firebaseAdmin");

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

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((a - b) / msPerDay);
}

async function checkReminders() {
  const today = new Date();
  const key = todayKey();

  const eventsSnap = await db().collection("events").get();
  if (eventsSnap.empty) return;

  for (const eventDoc of eventsSnap.docs) {
    const event = { id: eventDoc.id, ...eventDoc.data() };
    const config = event.reminderConfig || {};
    if (!config.enabled) continue;

    const eventDate = new Date(event.date);
    const daysUntil = daysBetween(eventDate, today);
    const startDaysBefore = Number(config.startDaysBefore ?? 5);
    const intervalDays = Number(config.intervalDays ?? 1);

    if (daysUntil < 0 || daysUntil > startDaysBefore) continue;

    const sentDates = event.reminderSentDates || [];
    if (sentDates.includes(key)) continue; // sudah dikirim hari ini untuk event ini

    const daysSinceStart = startDaysBefore - daysUntil;
    const isDueDay = daysSinceStart % intervalDays === 0;
    if (!isDueDay) continue;

    const guestsSnap = await db()
      .collection("events")
      .doc(event.id)
      .collection("guests")
      .where("status", "==", "sent")
      .get();

    if (guestsSnap.empty) continue;

    console.log(`[reminder] Menjadwalkan reminder untuk "${event.name}" (H-${daysUntil}), ${guestsSnap.size} tamu`);

    const batch = db().batch();
    guestsSnap.docs.forEach((gDoc) => {
      const guest = { id: gDoc.id, ...gDoc.data() };
      const message = renderTemplate(
        event.reminderTemplate || "Reminder: acara {{event_name}} pada {{date}} di {{location}}.",
        event,
        guest
      );
      const queueRef = db().collection("queue").doc();
      batch.set(queueRef, {
        eventId: event.id,
        guestId: guest.id,
        phone: guest.phone,
        message,
        type: "reminder",
        scheduledAt: new Date().toISOString(),
        status: "pending",
        attempts: 0,
        createdAt: new Date().toISOString(),
      });
    });

    batch.set(
      eventDoc.ref,
      { reminderSentDates: [...sentDates, key] },
      { merge: true }
    );

    await batch.commit();
  }
}

module.exports = { checkReminders };
