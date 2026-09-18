"use client";

import { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { useInView } from "@/lib/hooks/useInView";

type RevealOnScrollProps = {
    children: ReactNode;
    /** Delay tambahan (ms) untuk mengatur reveal berurutan antar elemen bersaudara. */
    delayMs?: number;
    className?: string;
};

// Pembungkus tipis untuk animasi "muncul saat di-scroll": elemen mulai sedikit
// turun dan transparan, lalu naik ke posisi normal begitu masuk viewport.
// Dipakai berulang di berbagai section supaya landing page terasa hidup tanpa
// tiap section menulis ulang logic IntersectionObserver-nya sendiri.
export default function RevealOnScroll({
    children,
    delayMs = 0,
    className,
}: RevealOnScrollProps) {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <div
            ref={ref}
            className={cn(
                "transition-all duration-700 ease-out",
                isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                className
            )}
            style={{ transitionDelay: isInView ? `${delayMs}ms` : "0ms" }}
        >
            {children}
        </div>
    );
}
