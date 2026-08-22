import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Tipografía combinada: nunca todo en una sola familia.
// Space Grotesk = títulos · IBM Plex Sans = texto · JetBrains Mono = datos técnicos
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PitStops AI — Centro de Diagnóstico",
  description: "Sistema de prediagnóstico inteligente para talleres mecánicos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} font-body`}
      >
        {children}
      </body>
    </html>
  );
}
