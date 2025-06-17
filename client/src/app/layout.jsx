import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner"; // <-- Import from shadcn

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Whispr - Real-time Chat",
  description: "A modern real-time chat application.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors /> {/* <-- Add this */}
        </AuthProvider>
      </body>
    </html>
  );
}