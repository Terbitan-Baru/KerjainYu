"use client";

import { ClipboardList, UserIcon, UploadCloud, BadgeCheck } from "lucide-react";
import { cn } from "@/utils/cn";
import { useInView } from  "@/lib/hooks/useInView";

const STEPS = [
    {
        icon: ClipboardList,
        title: "Ketua rilis tugas ke pool",
        body: "Ketua bikin daftar tugas lengkap deskripsi dan tenggat, lalu lepas ke task pool.",
        note: "Pool terbuka untuk seluruh anggota",
    },
    {
        icon: UserIcon,
        title: "Anggota war ambil tugas",
        body: "Anggota rebutan tugas yang sesuai minat. Begitu diklaim, kartu langsung terkunci untuk dia.",
        note: "First come, first served secara real-time",
    },
    {
        icon: UploadCloud,
        title: "Kerjakan & submit hasil",
        body: "Yang pegang tugas mengerjakan sesuai tenggat, lalu kirim tautan atau file untuk ditinjau.",
        note: "Semua file tercatat di riwayat kartu",
    },
    {
        icon: BadgeCheck,
        title: "Ditinjau, lalu kelar",
        body: "Ketua memvalidasi submission: setujui langsung, atau kirim revisi dengan catatan jelas.",
        note: "Status tugas berpindah ke Selesai",
    },
];

const CONNECTOR_POSITION =
    "left-[13px] top-13 h-[calc(93%-1.75rem)] w-0.5 " +
    "lg:left-11 lg:top-[13px] lg:h-0.5 lg:w-[calc(97%-1.75rem)]";

export default function LandingWorkflow() {
    const { ref, isInView } = useInView<HTMLOListElement>({ threshold: 0.15 });

    return (
        <section
            id="alur-kerja"
            aria-labelledby="alur-kerja-heading"
            className="scroll-mt-14 px-4 py-12 sm:scroll-mt-16 sm:px-6 sm:py-20 lg:px-8"
        >
            <div className="mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="font-inter text-xs font-semibold uppercase tracking-wider text-primary">
                        Alur kolaborasi
                    </p>
                    <h2
                        id="alur-kerja-heading"
                        className="mt-1.5 text-balance font-inter text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl"
                    >
                        Bagaimana sistem war tugas berjalan
                    </h2>
                    <p className="mt-2.5 font-inter text-sm leading-relaxed text-muted sm:mt-3 sm:text-base">
                        Empat langkah sederhana dari bagi tugas sampai selesai
                        diverifikasi.
                    </p>
                </div>

                <ol
                    ref={ref}
                    className="relative mt-8 flex flex-col gap-0 sm:mt-12 lg:flex-row lg:gap-0"
                >
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isRevealed = isInView;
                        const isLast = index === STEPS.length - 1;

                        return (
                            <li key={step.title} className="relative flex lg:flex-1 lg:flex-col">
                                {/* Garis penghubung antar badge nomor: vertikal di
                                    mobile, horizontal dari lg: ke atas. Ikut
                                    "terisi" warna primary begitu langkah
                                    berikutnya menyala, jadi kelihatan seperti
                                    progres yang berjalan. */}
                                {!isLast && (
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "absolute z-0 rounded-full bg-border transition-colors duration-500",
                                            CONNECTOR_POSITION,
                                            isRevealed && "bg-primary/40"
                                        )}
                                        style={{
                                            transitionDelay: isRevealed
                                                ? `${(index + 1) * 150}ms`
                                                : "0ms",
                                        }}
                                    />
                                )}

                                <div
                                    className={cn(
                                        "relative z-10 flex flex-1 gap-4 py-4 transition-all duration-500 ease-out lg:flex-col lg:gap-0 lg:px-3 lg:py-0",
                                        isRevealed
                                            ? "translate-y-0 opacity-100"
                                            : "translate-y-3 opacity-0"
                                    )}
                                    style={{
                                        transitionDelay: isRevealed ? `${index * 150}ms` : "0ms",
                                    }}
                                >
                                    {/* size-7 = 28px, dikunci lewat shrink-0 supaya
                                        perhitungan posisi garis di atas selalu
                                        cocok berapa pun panjang teksnya. */}
                                    <span
                                        className={cn(
                                            "flex size-7 shrink-0 items-center justify-center rounded-full font-inter text-xs font-bold transition-colors duration-500 lg:mb-4",
                                            isRevealed
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary text-muted"
                                        )}
                                        style={{
                                            transitionDelay: isRevealed
                                                ? `${index * 150}ms`
                                                : "0ms",
                                        }}
                                    >
                                        {index + 1}
                                    </span>

                                    <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:flex lg:flex-col">
                                        <Icon
                                            aria-hidden="true"
                                            className={cn(
                                                "size-5 transition-colors duration-500",
                                                isRevealed ? "text-primary" : "text-muted"
                                            )}
                                        />
                                        <h3 className="mt-2.5 font-inter text-base font-semibold text-foreground">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1.5 font-inter text-sm leading-relaxed text-muted lg:flex-1">
                                            {step.body}
                                        </p>
                                        <p
                                            className={cn(
                                                "mt-3 inline-block w-fit rounded-lg px-2.5 py-1.5 font-inter text-xs transition-colors duration-500",
                                                isRevealed
                                                    ? "bg-primary/10 font-semibold text-primary"
                                                    : "bg-secondary text-muted"
                                            )}
                                        >
                                            {step.note}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
