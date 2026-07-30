import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import AITutor from "@/components/AITutor";
import SyncGate from "@/components/SyncGate";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RishAlgo AI — Learn · Visualize · Solve · Get Interviewed",
  description:
    "Interactive DSA practice with algorithm visualization, a step-through visual debugger, graded AI hints, and adaptive AI mock interviews.",
};

/** Applies the stored theme before first paint so there is no flash. */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('rishalgo-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SyncGate />
          <Shell>{children}</Shell>
          <AITutor />
        </AuthProvider>
      </body>
    </html>
  );
}
