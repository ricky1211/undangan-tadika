"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    inviteTemplate:
      "Halo {{name}}, kami mengundang Anda ke {{event_name}} pada {{date}} di {{location}}. Mohon konfirmasi kehadiran ya. Terima kasih!",
    reminderTemplate:
      "Halo {{name}}, ini pengingat untuk acara {{event_name}} pada {{date}} di {{location}}. Sampai jumpa!",
    startDaysBefore: 5,
    intervalDays: 1,
    reminderEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.date) {
      setError("Nama acara dan tanggal/jam wajib diisi.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        date: new Date(form.date).toISOString(),
        location: form.location,
        description: form.description,
        inviteTemplate: form.inviteTemplate,
        reminderTemplate: form.reminderTemplate,
        reminderConfig: {
          enabled: form.reminderEnabled,
          startDaysBefore: Number(form.startDaysBefore),
          intervalDays: Number(form.intervalDays),
        },
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal membuat acara.");
      return;
    }
    router.push(`/dashboard/events/${data.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-semibold mb-6">Buat Acara Baru</h1>

      <form onSubmit={handleSubmit} className="card p-6 grid gap-4">
        <div>
          <label className="label">Nama Acara</label>
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tanggal &amp; Jam Acara</label>
            <input
              type="datetime-local"
              className="input"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Lokasi</label>
            <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Deskripsi (opsional)</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>

        <div>
          <label className="label">Template Pesan Undangan</label>
          <textarea className="input" rows={3} value={form.inviteTemplate} onChange={(e) => update("inviteTemplate", e.target.value)} />
          <p className="text-xs text-[#5a5747] mt-1">Placeholder: {"{{name}}"}, {"{{event_name}}"}, {"{{date}}"}, {"{{location}}"}</p>
        </div>

        <div>
          <label className="label">Template Pesan Reminder</label>
          <textarea className="input" rows={3} value={form.reminderTemplate} onChange={(e) => update("reminderTemplate", e.target.value)} />
        </div>

        <div className="card p-4 bg-[#fbfaf7]">
          <p className="label mb-3">Pengaturan Reminder Otomatis</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="reminderEnabled"
              checked={form.reminderEnabled}
              onChange={(e) => update("reminderEnabled", e.target.checked)}
            />
            <label htmlFor="reminderEnabled" className="text-sm">Aktifkan reminder otomatis</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Mulai H-berapa</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.startDaysBefore}
                onChange={(e) => update("startDaysBefore", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ulangi setiap (hari)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.intervalDays}
                onChange={(e) => update("intervalDays", e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-[#5a5747] mt-2">
            Contoh: mulai H-5, ulangi tiap 1 hari → reminder terkirim otomatis di H-5, H-4, H-3, H-2, H-1, dan hari-H.
          </p>
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}

        <div className="flex justify-end gap-3 mt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Acara"}
          </button>
        </div>
      </form>
    </div>
  );
}
