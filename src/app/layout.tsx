import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApolloWrapper } from "@/lib/ApolloWrapper";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider } from "@/lib/AuthContext"; // <-- 1. IMPORT THE PROVIDER

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UPSCALE CRM",
  description: "CRM for Water Purifier Business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ApolloWrapper>
          <AuthProvider> {/* <-- 2. WRAP YOUR COMPONENTS */}
            <Header />
            <main className="container mx-auto p-4 md:px-6 min-h-screen">
              {children}
            </main>
            <Footer />
          </AuthProvider> {/* <-- 3. CLOSE THE WRAPPER */}
        </ApolloWrapper>
      </body>
    </html>
  );
}
