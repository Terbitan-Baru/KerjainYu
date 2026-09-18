import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import LandingBoardPreview from "@/components/features/landing/LandingBoardPreview";

export default function LandingHero() {
    return (
        <section className="px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-35 lg:px-8 lg:pb-14 lg:pt-30">
            <div className="mx-auto max-w-5xl">
                {/* max-w-[18ch] di mobile menjaga judul tetap 2 baris: baris yang
                    terlalu panjang bikin mata susah balik ke awal baris. */}
                <h1 className="max-w-[18ch] text-balance font-inter text-[1.625rem] font-semibold leading-[1.18] tracking-tight text-foreground sm:max-w-2xl sm:text-3xl lg:text-4xl">
                    Bagi tugas kelompok, tanpa drama grup chat
                </h1>

                <p className="mt-3 max-w-[38ch] font-inter text-sm leading-relaxed text-muted sm:max-w-lg sm:text-base">
                    Ketua lepas tugas ke pool, anggota tinggal klaim. Semua
                    progres di satu papan.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center">
                    <Link
                        href={ROUTES.REGISTER}
                        className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-inter font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-11 sm:w-auto sm:px-5"
                    >
                        Bikin project pertama
                    </Link>

                    {/* Tombol sekunder sengaja disembunyikan di mobile: aksinya
                        sudah ada di header, dan menaruh dua tombol sebesar ini
                        berdampingan menghapus hierarki antara keduanya. */}
                    <Link
                        href={ROUTES.LOGIN}
                        className="hidden min-h-11 items-center justify-center rounded-full border border-border px-5 text-base font-inter font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex"
                    >
                        Sudah punya akun
                    </Link>
                </div>

                {/* Satu baris mikro saja. Di mobile dia merangkap dua fungsi
                    (penenang soal harga + jalan masuk buat user lama) supaya
                    tidak perlu dua blok teks terpisah. */}
                <p className="mt-3 font-inter text-xs text-muted sm:text-sm">
                    <span className="sm:hidden">
                        Gratis buat tim kecil.{" "}
                        <Link
                            href={ROUTES.LOGIN}
                            className="font-medium text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Sudah punya akun?
                        </Link>
                    </span>
                    <span className="hidden sm:inline">
                        Gratis buat kelompok kuliah, komunitas, dan tim kecil.
                    </span>
                </p>

                <div className="mt-8 sm:mt-10">
                    <LandingBoardPreview />
                </div>
            </div>
        </section>
    );
}
