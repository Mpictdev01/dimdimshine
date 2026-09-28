import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "./components/InstallPrompt";
import PwaUpdateGuard from "./components/PwaUpdateGuard";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "DIMDIM SHINE POS",
  description: "DIMDIM SHINE Point of Sale and Sales Management Application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DIMDIM SHINE POS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <InstallPrompt />
        <PwaUpdateGuard />
      </body>
    </html>
  );
}
