require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const cron = require("node-cron");
const path = require("path");

const { db } = require("./lib/firebaseAdmin");
const { processQueue } = require("./lib/sendQueue");
const { checkReminders } = require("./lib/reminder");

const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, "session");
const logger = pino({ level: "warn" });

let sock = null;
let queueTimer = null;

async function updateSystemStatus(data) {
  await db()
    .collection("system")
    .doc("whatsapp")
    .set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Undangan WA", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR baru diterima, tersimpan ke Firestore untuk dipindai dari dashboard.");
      await updateSystemStatus({ status: "connecting", qr, phoneNumber: null });
    }

    if (connection === "open") {
      console.log("WhatsApp terhubung.");
      const phoneNumber = sock.user?.id?.split(":")[0] || null;
      await updateSystemStatus({ status: "connected", qr: null, phoneNumber });
      startQueueLoop();
    }

    if (connection === "close") {
      stopQueueLoop();
      sock = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Koneksi terputus.", statusCode, "reconnect:", shouldReconnect);
      await updateSystemStatus({ status: "disconnected", qr: null });

      if (shouldReconnect) {
        setTimeout(startWhatsApp, 5000);
      } else {
        console.log("Sesi logout. Hapus folder session/ lalu jalankan ulang untuk scan QR baru.");
      }
    }
  });
}

function startQueueLoop() {
  if (queueTimer) return;
  queueTimer = setInterval(async () => {
    try {
      if (sock) await processQueue(sock);
    } catch (err) {
      console.error("[queue] Error:", err.message);
    }
  }, 30 * 1000); // cek antrian tiap 30 detik
}

function stopQueueLoop() {
  if (queueTimer) {
    clearInterval(queueTimer);
    queueTimer = null;
    console.log("[queue] Antrian dihentikan (WhatsApp terputus).");
  }
}

function startReminderCron() {
  const hour = process.env.REMINDER_CRON_HOUR || "8";
  const minute = process.env.REMINDER_CRON_MINUTE || "0";
  const expr = `${minute} ${hour} * * *`;

  cron.schedule(expr, async () => {
    console.log("[reminder] Menjalankan pengecekan reminder harian...");
    try {
      await checkReminders();
    } catch (err) {
      console.error("[reminder] Error:", err.message);
    }
  });

  console.log(`[reminder] Cron reminder harian diset pada jam ${hour}:${minute} (server time).`);
}

async function main() {
  console.log("Menjalankan worker undangan WhatsApp...");
  await updateSystemStatus({ status: "connecting", qr: null, phoneNumber: null });
  await startWhatsApp();
  startReminderCron();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
