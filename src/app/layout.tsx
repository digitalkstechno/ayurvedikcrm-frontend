import type { Metadata } from "next";
import { Inter, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "../components/layout/LayoutWrapper";
import NextTopLoader from "nextjs-toploader";
import { SettingsProvider } from "../context/SettingsContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CRM",
  description: "Advanced premium management portal for businesses to manage leads, tasks, and customer interactions with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${nunitoSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground transition-all duration-300 font-nunito">
        <NextTopLoader
          color="#0F766E"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #0F766E,0 0 5px #0F766E"
        />
        <SettingsProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </SettingsProvider>
      </body>
    </html>
  );
}


