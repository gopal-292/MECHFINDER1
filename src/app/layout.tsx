import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "WebMech — Roadside Assistance",
  description: "Stuck on the road? Get a verified mechanic to you in minutes.",
  manifest: "/manifest.webmanifest",
  applicationName: "WebMech",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WebMech",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
