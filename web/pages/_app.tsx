import { ThemeProvider } from "@/context/themecontext";
import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";
import { Syne, DM_Sans } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className={`${syne.variable} ${dmSans.variable} font-body`}>
          <Analytics />
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
