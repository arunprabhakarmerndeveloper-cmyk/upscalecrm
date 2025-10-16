import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApolloWrapper } from "@/lib/ApolloWrapper";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({ subsets: ["latin"] });

// --- THIS IS THE CHANGE ---
// The path now correctly points to your icon in the public folder.
export const metadata: Metadata = {
  title: "CRM-Upscale Water Solutions",
  description: "CRM for Water Purifier Business",
};
// --- END OF CHANGE ---

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ApolloWrapper>
          <AuthProvider>
            <Header />
            <main className="container min-h-screen p-4 mx-auto md:px-6">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}