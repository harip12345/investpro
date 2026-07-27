import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AIWidget } from "@/components/ai-widget";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "InvestPro - Analisis Saham Indonesia",
  description: "Platform analisis investasi saham dengan fundamental, teknikal, dan AI asisten"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem("investpro-theme")||"dark"}catch(e){document.documentElement.dataset.theme="dark"}` }} />
      </head>
      <body>
        <AuthShell>
          <div className="app-shell">
            <Navbar />
            <main className="min-w-0 overflow-x-hidden px-4 py-6 md:px-8 md:py-10">{children}</main>
            <AIWidget />
          </div>
        </AuthShell>
      </body>
    </html>
  );
}
