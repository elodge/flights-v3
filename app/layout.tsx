import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { ClientOnly } from '@/components/client-only'
import { Plane } from 'lucide-react'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daysheets Flight Management System",
  description: "Professional flight management system for artists and crews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <ClientOnly 
              fallback={
                <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                  <div className="container flex h-16 max-w-screen-2xl items-center px-4">
                    <div className="flex items-center space-x-3 mr-6">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-bold leading-tight tracking-tight">
                          Daysheets
                        </span>
                        <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                          Flight Management
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1"></div>
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                </header>
              }
            >
              <Header />
            </ClientOnly>
            <main className="flex-1">
              <div className="container mx-auto max-w-screen-2xl px-4 py-6">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
