"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function StatusPill({ status }) {
  const map = {
    connected: { label: "Terhubung", cls: "badge-sent" },
    connecting: { label: "Menghubungkan...", cls: "badge-queued" },
    disconnected: { label: "Terputus", cls: "badge-failed" },
    unknown: { label: "Belum ada worker", cls: "badge-draft" },
  };
  const s = map[status] || map.unknown;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [waStatus, setWaStatus] = useState({ status: "unknown", qr: null, phoneNumber: null });
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  async function loadStatus() {
    const res = await fetch("/api/worker-status");
    const data = await res.json();
    setWaStatus(data);
  }

  useEffect(() => {
    loadEvents();
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold">Panel Undangan WhatsApp</h1>
        <Link href="/dashboard/events/new" className="btn-primary">+ Acara Baru</Link>
      </div>

      <div className="card p-5 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="label mb-1">Status Koneksi WhatsApp (Worker)</p>
          <div className="flex items-center gap-2">
            <StatusPill status={waStatus.status} />
            {waStatus.phoneNumber && (
              <span className="text-sm text-[#5a5747]">nomor: {waStatus.phoneNumber}</span>
            )}
          </div>
        </div>
        {waStatus.status !== "connected" && waStatus.qr && (
          <div className="text-center">
            <p className="text-xs text-[#5a5747] mb-2">Scan QR ini pakai WhatsApp di HP kamu</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waStatus.qr)}`}
              alt="QR WhatsApp"
              className="rounded-lg border border-sand"
              width={140}
              height={140}
            />
          </div>
        )}
        {waStatus.status === "unknown" && (
          <p className="text-sm text-[#5a5747] max-w-sm">
            Worker belum jalan / belum terhubung ke database. Pastikan worker sudah di-deploy dan
            dijalankan (lihat README).
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#5a5747]">Memuat acara...</p>
      ) : events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[#5a5747]">Belum ada acara. Buat acara pertamamu.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/dashboard/events/${ev.id}`}
              className="card p-5 flex items-center justify-between hover:border-ink transition"
            >
              <div>
                <p className="font-display text-lg font-semibold">{ev.name}</p>
                <p className="text-sm text-[#5a5747]">
                  {new Date(ev.date).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </div>
              <span className="text-sm text-moss font-medium">Kelola →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
