import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "./context/UserContext";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Events - Student Portal",
  description: "Discover and register for events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F5F5F7]">
        <UserProvider>
          <Header />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
