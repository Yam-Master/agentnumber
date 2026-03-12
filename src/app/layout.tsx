import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentNumber — Give Your Agent a Phone Number",
  description:
    "Voice + SMS for AI agents. Pay with USDC, get a phone number in under 5 minutes.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "AgentNumber",
    description: "Give your agent a phone number. Voice + SMS. Pay with USDC.",
    type: "website",
    url: "https://agentnumber.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
