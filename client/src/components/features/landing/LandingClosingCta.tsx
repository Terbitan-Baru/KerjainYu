import Link from "next/link";
import { Rocket } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import RevealOnScroll from "@/components/features/landing/RevealOnScroll";

export default function LandingClosingCta() {
    return (
        <section className="bg-card px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <RevealOnScroll className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl bg-foreground px-5 py-10 text-center sm:px-10 sm:py-14">
                <h2 className="mt-4 max-w-md text-balance font-inter text-2xl font-semibold tracking-tight text-background sm:text-3xl">
                    Siap selesaikan tugas kelompok tanpa drama silent reader?
                </h2>
                <p className="mt-3 max-w-md text-[15px] font-inter text-base leading-relaxed text-background/70">
                    Bikin project pertamamu, undang timnya, terus lepas tugas pertama ke
                    task pool.
                </p>
                <Link
                    href={ROUTES.REGISTER}
                    className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-inter font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:w-auto"
                >
                    Bikin project pertama
                    <Rocket className="size-4" />
                </Link>
            </RevealOnScroll>
        </section>
    );
}
