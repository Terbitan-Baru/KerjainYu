import { UserCog, Users } from "lucide-react";
import RevealOnScroll from "@/components/features/landing/RevealOnScroll";

const ROLES = [
    {
        title: "Ketua",
        subtitle: "Pengatur ritme & validator kualitas",
        icon: UserCog,
        accent: true,
        items: [
            "Bikin, ubah, dan hapus tugas",
            "Lepas tugas ke task pool atau kasih ke orang tertentu",
            "Tinjau submission: setujui, minta revisi, atau tolak",
            "Undang dan keluarkan anggota",
            "Arsipkan project kalau sudah kelar",
        ],
        note: "Nggak perlu micromanage dari chat, nggak perlu sungkan negur anggota.",
    },
    {
        title: "Anggota",
        subtitle: "Fokus eksekusi & kepemilikan mandiri",
        icon: Users,
        accent: false,
        items: [
            "Klaim tugas dari task pool (siapa cepat dia dapat)",
            "Kerjain tugas yang lagi dipegang",
            "Ajukan tukar tugas kalau butuh",
            "Submit hasil kerja beserta file atau tautan",
            "Lihat progres semua orang di satu papan",
        ],
        note: "Bisa pilih tugas yang disukai, punya bukti konkret sudah bekerja.",
    },
];

export default function LandingRoles() {
    return (
        <section
            id="peran"
            aria-labelledby="peran-heading"
            className="scroll-mt-14 px-4 py-14 sm:scroll-mt-16 sm:px-6 sm:py-20 lg:px-8"
        >
            <div className="mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="font-inter text-xs font-semibold uppercase tracking-wider text-primary">
                        Hak akses proporsional
                    </p>
                    <h2
                        id="peran-heading"
                        className="mt-1.5 text-balance font-inter text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        Peran jelas: ketua vs anggota
                    </h2>
                    <p className="mt-3 font-inter text-base leading-relaxed text-muted">
                        Struktur terukur biar ketua nggak kelelahan nagih progres, dan
                        anggota tahu persis apa yang harus diselesaikan.
                    </p>
                </div>

                <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
                    {ROLES.map((role, index) => {
                        const Icon = role.icon;
                        return (
                            <RevealOnScroll
                                key={role.title}
                                delayMs={index * 150}
                                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6"
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={
                                                role.accent
                                                    ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                                                    : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground"
                                            }
                                        >
                                            <Icon className="size-5" />
                                        </span>
                                        <div>
                                            <h3 className="font-inter text-lg font-semibold text-foreground">
                                                {role.title}
                                            </h3>
                                            <p
                                                className={
                                                    role.accent
                                                        ? "font-inter text-xs font-semibold text-primary"
                                                        : "font-inter text-xs font-semibold text-muted"
                                                }
                                            >
                                                {role.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <ul className="mt-5 flex flex-col gap-2.5">
                                        {role.items.map((item) => (
                                            <li key={item} className="flex gap-2.5">
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-primary"
                                                />
                                                <span className="font-inter text-sm leading-relaxed text-foreground">
                                                    {item}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <p className="mt-5 rounded-xl bg-secondary px-3 py-2.5 font-inter text-xs leading-relaxed text-muted">
                                    {role.note}
                                </p>
                            </RevealOnScroll>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
