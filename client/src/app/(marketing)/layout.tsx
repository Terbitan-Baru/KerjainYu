import type { Metadata } from "next";
import { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: `${APP_NAME}: kolaborasi tugas tim tanpa drama grup chat`,
    description:
        "Ketua taruh tugas di task pool, anggota tinggal klaim yang mau dikerjain. Tukar tugas kalau perlu, submit hasilnya, lalu ketua yang meninjau.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative min-h-dvh w-full overflow-x-hidden bg-background">
            {children}
        </div>
    );
}
