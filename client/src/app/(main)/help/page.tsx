import HelpCenterView from "@/components/features/help/HelpCenterView";

export default function HelpCenterPage() {
    return (
        <>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
                    Pusat Bantuan
                </h2>
            </div>
            <p className="mt-1 text-sm font-inter text-muted">
                Cari jawaban seputar fitur KerjainYu, atau jelajahi berdasarkan kategori.
            </p>
            <div className="mt-4">
                <HelpCenterView />
            </div>
        </>
    );
}
