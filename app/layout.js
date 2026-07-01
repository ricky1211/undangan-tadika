import "./globals.css";

export const metadata = {
  title: "Undangan WA — Panel Kirim",
  description: "Kelola undangan WhatsApp dan reminder acara.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
