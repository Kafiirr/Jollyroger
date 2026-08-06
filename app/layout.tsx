import type { Metadata } from "next";
import { Fredoka, Noto_Serif_KR, Gochi_Hand, Press_Start_2P } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import "./globals.css";

/*  next/font  —  /FOIT   (globals.css @import ).
   info info tailwind.config.ts fontFamilyinfo CSS info info. */
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});
const gochiHand = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gochi-hand",
  display: "swap",
});
// (8)  — GAME START/GAME OVER
const pressStart2p = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jolly Roger",
  description: "Show off your TCG collection in your own interactive room",
  icons: {
    icon: [
      { url: "/image/jollyroger.ico", sizes: "any" },
      { url: "/image/jollyroger.svg", type: "image/svg+xml" },
    ],
    apple: "/image/jollyroger.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${notoSerifKr.variable} ${gochiHand.variable} ${pressStart2p.variable}`}
    >
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}

