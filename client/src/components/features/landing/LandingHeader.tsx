"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { getInitials } from "@/utils/getInitials";
import { cn } from "@/utils/cn";

const NAV_LINKS = [
    { href: "#kenapa-kerjainyu", label: "Kenapa KerjainYu?" },
    { href: "#alur-kerja", label: "Alur War Tugas" },
    { href: "#fitur", label: "Fitur" },
    { href: "#peran", label: "Peran Tim" },
];

export default function LandingHeader() {
    const [activeHref, setActiveHref] = useState<string | null>(null);

    useEffect(() => {
        const sections = NAV_LINKS.map((link) =>
            document.querySelector(link.href)
        ).filter((el): el is Element => el !== null);

        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible.length > 0) {
                    setActiveHref(`#${visible[0].target.id}`);
                }
            },
            { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
        );

        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, []);

    return (
        <header className="fixed w-full top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-inter font-semibold text-primary-foreground"
                    >
                        {getInitials(APP_NAME)}
                    </span>
                    <span className="font-inter text-base font-semibold tracking-tight text-foreground">
                        {APP_NAME}
                    </span>
                </div>

                <nav
                    aria-label="Navigasi utama"
                    className="hidden items-center gap-1 lg:flex"
                >
                    {NAV_LINKS.map((link) => {
                        const isActive = activeHref === link.href;
                        return (
                            <a
                                key={link.href}
                                href={link.href}
                                aria-current={isActive ? "location" : undefined}
                                className={cn(
                                    "relative rounded-lg px-3 py-2 font-inter text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    isActive
                                        ? "text-foreground"
                                        : "text-muted hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                {link.label}
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-primary transition-opacity",
                                        isActive ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </a>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-1 sm:gap-2">
                    <Link
                        href={ROUTES.LOGIN}
                        className="flex min-h-11 items-center rounded-full px-3 text-sm font-inter font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
                    >
                        Masuk
                    </Link>
                    <Link
                        href={ROUTES.REGISTER}
                        className="flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-inter font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        Daftar
                    </Link>
                </div>
            </div>
        </header>
    );
}
