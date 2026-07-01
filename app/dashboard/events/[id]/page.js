"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Draft", cls: "badge-draft" },
    queued: { label: "Dijadwalkan", cls: "badge-queued" },
    sent: { label: "Terkirim", cls: "badge-sent" },
    failed: { label: "Gagal", cls: "badge-failed" },
  };
  const s = map[status] || map.draft;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bulkText, setBulkText] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [scheduleAt, setScheduleAt] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/events/${id}`);
    const data = await res.json();
    setEvent(data.event);
    setGuests(data.guests || []);
    setLoading(false);
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function addBulkGuests() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const guestsToAdd = lines.map((line) => {
      const [name, phone] = line.split(",").map((s) => s.trim());
      return { name, phone };
    }).filter((g) => g.name && g.phone);

    if (guestsToAdd.length === 0) {
      setMessage("Format tidak valid. Gunakan: Nama, Nomor HP (satu baris per tamu).");
      return;
    }

    const res = await fetch(`/api/events/${id}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests: guestsToAdd }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Gagal menambah tamu.");
      return;
    }
    setBulkText("");
    setMessage(`${data.added} tamu berhasil ditambahkan.`);
    load();
  }

  async function removeGuest(guestId) {
    await fetch(`/api/events/${id}/guests/${guestId}`, { method: "DELETE" });
    load();
  }

  function toggleSelect(guestId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function selectAllDraft() {
    setSelected(new Set(guests.filter((g) => g.status !== "sent").map((g) => g.id)));
  }

  async function handleSchedule() {
    if (selected.size === 0) {
      setMessage("Pilih minimal satu tamu terlebih dahulu.");
      return;
    }
    const res = await fetch(`/api/events/${id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: sendNow ? null : new Date(scheduleAt).toISOString(),
        guestIds: Array.from(selected),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Gagal menjadwalkan.");
      return;
    }
    setMessage(
      sendNow
        ? `${data.queued} undangan akan segera dikirim oleh worker.`
        : `${data.queued} undangan dijadwalkan pada ${new Date(data.scheduledAt).toLocaleString("id-ID")}.`
    );
    setSelected(new Set());
    load();
  }

  if (loading) return <div className="max-w-4xl mx-auto px-5 py-10">Memuat...</div>;
  if (!event) return <div className="max-w-4xl mx-auto px-5 py-10">Acara tidak ditemukan.</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <p className="text-sm text-moss font-medium mb-1">
        <a href="/dashboard">← Kembali</a>
      </p>
      <h1 className="font-display text-3xl font-semibold mb-1">{event.name}</h1>
      <p className="text-[#5a5747] mb-6">
        {new Date(event.date).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}
        {event.location ? ` · ${event.location}` : ""}
      </p>

      {event.reminderConfig?.enabled && (
        <div className="card p-4 mb-6 bg-[#e3f3ea] border-moss/30">
          <p className="text-sm text-moss">
            Reminder otomatis aktif: mulai H-{event.reminderConfig.startDaysBefore}, diulang setiap{" "}
            {event.reminderConfig.intervalDays} hari sampai hari-H.
          </p>
        </div>
      )}

      {message && (
        <div className="card p-3 mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="card p-6 mb-6">
        <p className="label mb-2">Tambah Tamu (satu baris per tamu)</p>
        <textarea
          className="input mb-2 font-mono text-sm"
          rows={4}
          placeholder={"Budi Santoso, 081234567890\nSiti Aminah, 081298765432"}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <button className="btn-secondary" onClick={addBulkGuests}>Tambahkan Tamu</button>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="label m-0">Daftar Tamu ({guests.length})</p>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm" onClick={selectAllDraft}>Pilih semua belum terkirim</button>
          </div>
        </div>

        <div className="grid gap-2 mb-4 max-h-80 overflow-y-auto">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center justify-between border border-sand rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggleSelect(g.id)}
                />
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-[#5a5747]">{g.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={g.status} />
                <button className="text-xs text-clay" onClick={() => removeGuest(g.id)}>Hapus</button>
              </div>
            </div>
          ))}
          {guests.length === 0 && <p className="text-sm text-[#5a5747]">Belum ada tamu.</p>}
        </div>

        <div className="border-t border-sand pt-4">
          <p className="label mb-3">Kirim / Jadwalkan Undangan ({selected.size} tamu dipilih)</p>
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} />
              Kirim sekarang
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} />
              Jadwalkan
            </label>
            {!sendNow && (
              <input
                type="datetime-local"
                className="input w-auto"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            )}
          </div>
          <button className="btn-primary" onClick={handleSchedule}>
            {sendNow ? "Kirim Sekarang" : "Jadwalkan Pengiriman"}
          </button>
        </div>
      </div>
    </div>
  );
}
