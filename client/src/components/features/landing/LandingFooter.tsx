import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { getInitials } from "@/utils/getInitials";

const FOOTER_LINKS = [
    { href: "#kenapa-kerjainyu", label: "Kenapa KerjainYu?" },
    { href: "#alur-kerja", label: "Alur War Tugas" },
    { href: "#fitur", label: "Fitur" },
    { href: "#peran", label: "Peran Tim" },
];

export default function LandingFooter() {
    return (
        <footer className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-inter font-semibold text-primary-foreground"
                            >
                                {getInitials(APP_NAME)}
                            </span>
                            <span className="font-inter text-base font-semibold text-foreground">
                                {APP_NAME}
                            </span>
                        </div>
                        <p className="max-w-md font-inter text-sm text-muted">
                            Sistem war tugas dan task pool kolaboratif, dibuat untuk kerja
                            kelompok yang lebih rapi.
                        </p>
                    </div>

                </div>

                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <nav
                        aria-label="Tautan footer"
                        className="flex flex-wrap items-center gap-x-4 gap-y-2"
                    >
                        {FOOTER_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="font-inter text-sm text-muted transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href={ROUTES.LOGIN}
                            className="font-inter text-sm text-muted transition-colors hover:text-foreground"
                        >
                            Masuk
                        </Link>
                        <Link
                            href={ROUTES.REGISTER}
                            className="font-inter text-sm text-muted transition-colors hover:text-foreground"
                        >
                            Daftar
                        </Link>
                    </nav>
                    <p className="font-inter text-sm text-muted">
                        &copy; {new Date().getFullYear()} {APP_NAME}. Kolaborasi jujur,
                        hasil maksimal.
                    </p>
                </div>
            </div>
        </footer>
    );
}
