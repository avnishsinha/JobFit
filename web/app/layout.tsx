import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobFit",
  description: "Understand how your experience aligns with a job.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
