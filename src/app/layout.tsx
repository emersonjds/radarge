import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/shared/providers/query-provider";
import { SidebarProvider } from "@tailadmin/context/SidebarContext";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radarge — presença escolar",
  description: "Chamada e acompanhamento de frequência escolar para professores e coordenação.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <QueryProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
