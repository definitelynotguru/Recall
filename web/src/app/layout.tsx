import type { Metadata, Viewport } from "next";
import { Syne, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/ToastProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/OfflineBanner";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
});

const themeInitScript = `(function(){try{var t=localStorage.getItem("recall-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export const metadata: Metadata = {
  title: "Recall — Notes & Reminders",
  description: "Recall — personal notes with reminders on Android",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Recall",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#020202",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AuthProvider>
          <ConfirmProvider>
            <ToastProvider>
              <OfflineBanner />
              {children}
              <ServiceWorkerRegister />
            </ToastProvider>
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
