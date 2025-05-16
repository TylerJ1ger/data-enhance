//frontend-new/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "./providers";

// 使用Inter字体，并设置为变量以便在全局CSS中使用
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-sans" 
});

export const metadata: Metadata = {
  title: {
    template: "%s | 数据分析工具",
    default: "数据分析工具",
  },
  description: "CSV, Sitemap, SEO, 外链分析和数据可视化工具",
  authors: [
    {
      name: "数据分析团队",
    },
  ],
  keywords: ["数据分析", "CSV", "Sitemap", "SEO", "外链分析"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1 container py-6">
              {children}
            </main>
            <footer className="border-t py-4">
              <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
                <p className="text-center text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} 数据分析工具 - 版权所有
                </p>
              </div>
            </footer>
          </div>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Providers>
      </body>
    </html>
  );
}