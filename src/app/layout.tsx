import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KTM – Kayard Transport Management",
  description: "Sistema de gestión de transporte – Kayard Transportes",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased" style={{ margin: 0, backgroundColor: "#000000" }}>
        {children}
      </body>
    </html>
  );
}
