import { X, Check } from "lucide-react";
import RevealOnScroll from "@/components/features/landing/RevealOnScroll";

const PAIN_POINTS = [
    {
        title: "Chat penting tenggelam obrolan santai",
        body: "Instruksi ketua ketimbun ratusan pesan lain, bikin anggota beralasan \"nggak kebaca\".",
    },
    {
        title: "Ditanya \"siapa yang mau ngerjain\", semua diam",
        body: "Semua saling menunggu dan pura-pura sibuk sampai detik-detik sebelum tenggat.",
    },
    {
        title: "Satu orang nanggung sebagian besar beban tugas",
        body: "Yang paling rajin jadi korban, sementara nama yang numpang tetap tercantum.",
    },
    {
        title: "File hasil kerja tercecer di banyak tautan",
        body: "Versi dokumen berantakan: \"Fix\", \"Fix_Final\", \"Fix_Banget\", berujung salah kompilasi.",
    },
];

const SOLUTIONS = [
    {
        title: "Tugas dilepas ke task pool, siapa cepat dia dapat",
        body: "Anggota ambil tugas yang sesuai keahliannya. Jelas siapa pegang apa sejak hari pertama.",
    },
    {
        title: "Transparan di satu papan buat semua orang",
        body: "Kelihatan siapa yang belum ambil tugas, tanpa ketua harus negur satu-satu di grup.",
    },
    {
        title: "Hasil kerja disubmit langsung di kartu tugas",
        body: "Tautan Google Docs, Figma, atau file lokal tersimpan rapi langsung di kartu terkait.",
    },
    {
        title: "Ketua tinggal review: setujui atau minta revisi",
        body: "Catatan perbaikan langsung dibaca yang ngerjain, tanpa debat panjang di chat pribadi.",
    },
];

export default function LandingReality() {
    return (
        <section
            id="kenapa-kerjainyu"
            aria-labelledby="kenapa-kerjainyu-heading"
            className="scroll-mt-14 bg-card px-4 py-14 sm:scroll-mt-16 sm:px-6 sm:py-20 lg:px-8"
        >
            <div className="mx-auto max-w-5xl">
                <p className="font-inter text-xs font-semibold uppercase tracking-wider text-primary">
                    Realita kerja kelompok
                </p>
                <h2
                    id="kenapa-kerjainyu-heading"
                    className="mt-1.5 max-w-lg text-balance font-inter text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                    Kenapa koordinasi tugas di grup chat selalu berakhir kacau?
                </h2>

                <div className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-2 lg:gap-6">
                    <RevealOnScroll className="flex flex-col rounded-2xl border border-border bg-background p-5 sm:p-6">
                        <h3 className="font-inter text-lg font-semibold text-foreground">
                            Drama klasik di grup chat
                        </h3>
                        <p className="mt-2 font-inter text-sm leading-relaxed text-muted">
                            Kebiasaan bagi tugas lewat obrolan panjang selalu memicu
                            kebingungan yang sama.
                        </p>

                        <ul className="mt-5 flex flex-col gap-4">
                            {PAIN_POINTS.map((point) => (
                                <li key={point.title} className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-muted"
                                    >
                                        <X className="size-3" strokeWidth={3} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-inter text-sm font-semibold text-foreground">
                                            {point.title}
                                        </p>
                                        <p className="mt-0.5 font-inter text-sm leading-relaxed text-muted">
                                            {point.body}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <p className="mt-6 rounded-xl bg-secondary px-3 py-2.5 font-inter text-xs leading-relaxed text-muted">
                            Hasilnya: hubungan tim renggang, stres menumpuk, hasil kerja
                            seadanya.
                        </p>
                    </RevealOnScroll>

                    <RevealOnScroll
                        delayMs={150}
                        className="flex flex-col rounded-2xl border border-primary/25 bg-background p-5 sm:p-6"
                    >
                        <h3 className="font-inter text-lg font-semibold text-foreground">
                            Cara main di KerjainYu
                        </h3>
                        <p className="mt-2 font-inter text-sm leading-relaxed text-muted">
                            Aturan mainnya transparan dan tidak menyisakan ruang untuk
                            alasan.
                        </p>

                        <ul className="mt-5 flex flex-col gap-4">
                            {SOLUTIONS.map((point) => (
                                <li key={point.title} className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                    >
                                        <Check className="size-3" strokeWidth={3} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-inter text-sm font-semibold text-foreground">
                                            {point.title}
                                        </p>
                                        <p className="mt-0.5 font-inter text-sm leading-relaxed text-muted">
                                            {point.body}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <p className="mt-6 rounded-xl bg-primary/10 px-3 py-2.5 font-inter text-xs font-medium leading-relaxed text-primary">
                            Hasilnya: beban kerja adil, tugas selesai terukur, tidak ada
                            yang bisa sembunyi.
                        </p>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
