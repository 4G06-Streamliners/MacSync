import type { Metadata } from "next";
import "./globals.css";
import DashboardShell from "./components/DashboardShell";

export const metadata: Metadata = {
  title: "Web Admin",
  description: "Admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
