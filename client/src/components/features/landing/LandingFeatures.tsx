import { ArrowLeftRight, CalendarDays, BellRing, Archive } from "lucide-react";
import RevealOnScroll from "@/components/features/landing/RevealOnScroll";

export default function LandingFeatures() {
    return (
        <section
            id="fitur"
            aria-labelledby="fitur-heading"
            className="scroll-mt-14 bg-card px-4 py-14 sm:scroll-mt-16 sm:px-6 sm:py-20 lg:px-8"
        >
            <div className="mx-auto max-w-5xl">
                <p className="font-inter text-xs font-semibold uppercase tracking-wider text-primary">
                    Spesifikasi praktis
                </p>
                <h2
                    id="fitur-heading"
                    className="mt-1.5 max-w-lg text-balance font-inter text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                    Fitur yang memang dibutuhkan tim kelompok
                </h2>
                <p className="mt-3 max-w-xl font-inter text-base leading-relaxed text-muted">
                    Bukan modul enterprise yang berbelit. Cuma fungsi esensial biar
                    project kalian beres.
                </p>

                <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-3">
                    {/* Tukar tugas dapat porsi paling besar: ini mekanik kedua yang
                        bikin KerjainYu beda setelah task pool. */}
                    <RevealOnScroll className="lg:col-span-2">
                        <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-inter text-xs font-semibold text-primary">
                                <ArrowLeftRight className="size-3.5" />
                                Fitur unggulan
                            </div>
                            <h3 className="mt-3 font-inter text-lg font-semibold text-foreground">
                                Salah ambil tugas? Tukar sama yang lain
                            </h3>
                            <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-muted sm:text-base">
                                Kalau tugas yang terlanjur diklaim ternyata kurang cocok,
                                anggota bisa ngajuin tukar ke rekan setim. Tergantung
                                pengaturan project, tukarnya langsung jalan begitu rekan
                                yang dituju setuju, atau nunggu persetujuan ketua dulu.
                            </p>

                            <div
                                aria-hidden="true"
                                className="mt-5 flex flex-col items-stretch gap-2 rounded-xl bg-secondary p-3 sm:flex-row sm:items-center sm:gap-3"
                            >
                                <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2">
                                    <p className="truncate font-inter text-xs font-medium text-foreground">
                                        Bab 2: Kajian teori
                                    </p>
                                    <p className="mt-0.5 font-inter text-[11px] text-muted">
                                        Andi
                                    </p>
                                </div>
                                <ArrowLeftRight className="mx-auto size-4 shrink-0 rotate-90 text-muted sm:rotate-0" />
                                <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2">
                                    <p className="truncate font-inter text-xs font-medium text-foreground">
                                        Bab 4: Analisis data
                                    </p>
                                    <p className="mt-0.5 font-inter text-[11px] text-muted">
                                        Bima
                                    </p>
                                </div>
                            </div>
                        </article>
                    </RevealOnScroll>

                    <RevealOnScroll delayMs={100}>
                        <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                                <CalendarDays className="size-5" />
                            </span>
                            <h3 className="mt-3 font-inter text-lg font-semibold text-foreground">
                                Kalender per project
                            </h3>
                            <p className="mt-2 font-inter text-sm leading-relaxed text-muted">
                                Semua tenggat dalam satu project kelihatan di tampilan
                                bulanan, termasuk tugas yang belum punya tanggal.
                            </p>
                        </article>
                    </RevealOnScroll>

                    <RevealOnScroll delayMs={200}>
                        <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                                <BellRing className="size-5" />
                            </span>
                            <h3 className="mt-3 font-inter text-lg font-semibold text-foreground">
                                Notifikasi real-time
                            </h3>
                            <p className="mt-2 font-inter text-sm leading-relaxed text-muted">
                                Ada tugas baru di pool, hasil review, atau permintaan
                                tukar tugas? Masuk saat itu juga, tanpa perlu refresh
                                halaman.
                            </p>
                            <p className="mt-4 font-inter text-xs text-muted">
                                Notifikasi in-app, tanpa spam
                            </p>
                        </article>
                    </RevealOnScroll>

                    <RevealOnScroll delayMs={300} className="lg:col-span-2">
                        <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                                <Archive className="size-5" />
                            </span>
                            <h3 className="mt-3 font-inter text-lg font-semibold text-foreground">
                                Project kelar? Arsipkan, bukan dihapus
                            </h3>
                            <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-muted sm:text-base">
                                Project yang sudah selesai bisa diarsipkan biar daftar
                                utama nggak penuh. Riwayat tugas, lampiran, dan catatan
                                reviewnya tetap tersimpan dan bisa diaktifkan lagi kapan
                                saja.
                            </p>
                        </article>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
