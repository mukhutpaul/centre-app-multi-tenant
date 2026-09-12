import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/providers/toast-provider";


export const metadata: Metadata = {
  title: "Plateforme de Formation Professionnelle",
  description:
    "Plateforme de gestion des centres de formation professionnelle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
