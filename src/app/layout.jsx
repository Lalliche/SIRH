import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import MotionProvider from "@/components/providers/MotionProvider";
import ThemeScript from "@/components/providers/ThemeScript";
import { site } from "@/content/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata = {
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: site.title, description: site.description, locale: "fr_DZ", type: "website" },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${bricolage.variable} ${plex.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg text-[12px] md:text-[14px] lg:text-[15px] xl:text-[16px]">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
