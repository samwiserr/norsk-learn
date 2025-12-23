import "./globals.css";
import type { ReactNode } from "react";
import ContextProvider from "@/src/context/Context";
import { AuthProvider } from "@/src/context/AuthContext";
import AppErrorBoundary from "@/src/components/AppErrorBoundary";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Norwegian Tutor",
  description: "Practice Norwegian with a CEFR-aligned tutor.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppErrorBoundary>
          <AuthProvider>
            <ContextProvider>{children}</ContextProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}

