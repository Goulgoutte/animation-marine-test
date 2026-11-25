import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { StoreProvider } from "@/lib/store";
import { BASE_PATH } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veille animation",
  description: "Veille emploi et suivi de candidatures pour la décoration en animation 2D",
  robots: { index: false, follow: false },
  applicationName: "Veille animation",
  icons: {
    icon: [{ url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE_PATH}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Veille", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f14" },
  ],
};

// Pose le thème choisi avant le premier affichage (évite le flash) ; absent = automatique.
const SCRIPT_THEME = `try{var t=localStorage.getItem("veille-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
