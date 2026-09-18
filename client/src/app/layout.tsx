import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({
    subsets: ['latin'],
    variable: "--font-inter",
})

export const metadata: Metadata = {
    title: "KerjainYu",
    description: "Kolaborasi tugas tim: bagi tugas, klaim dari task pool, tukar tugas, dan review hasil kerja di satu tempat.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id" className={`${inter.variable} antialiased`}>
            <body>
                {children}
            </body>
        </html>
    );
}