import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nativa | Trazabilidad agroexportadora",
  description: "Control inteligente de lotes, calidad y despacho.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
