import "./globals.css";
import "./utilities.css";
import type { ReactNode } from "react";
import ContextProvider from "@/src/context/ContextProvider";
import { AuthProvider } from "@/src/context/AuthContext";
import AppErrorBoundary from "@/src/components/AppErrorBoundary";
import { Providers } from "./providers";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Norwegian Tutor",
  description: "Practice Norwegian with a CEFR-aligned tutor.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var t=localStorage.getItem("norsk_theme");("dark"===t||!t&&matchMedia("(prefers-color-scheme:dark)").matches)&&document.documentElement.setAttribute("data-theme","dark")}catch(e){}}()`,
          }}
        />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <AppErrorBoundary>
            <AuthProvider>
              <ContextProvider>{children}</ContextProvider>
            </AuthProvider>
          </AppErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}

