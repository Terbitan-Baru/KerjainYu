"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { cn } from "@/utils/cn";

type ColumnId = "pool" | "ongoing" | "review" | "done";

type PreviewTask = {
    id: string;
    title: string;
    meta: string;
};

const COLUMN_ORDER: ColumnId[] = ["pool", "ongoing", "review", "done"];

const COLUMN_META: Record<ColumnId, { label: string; dot: string }> = {
    pool: { label: "Task Pool", dot: "bg-status-todo-text" },
    ongoing: { label: "Dikerjakan", dot: "bg-status-progress-text" },
    review: { label: "Ditinjau", dot: "bg-role-guest-text" },
    done: { label: "Selesai", dot: "bg-status-done-text" },
};

// Judul dipendekkan supaya muat di lebar kolom mobile tanpa terpotong di
// tengah kata, sekaligus disesuaikan dengan nama project di header papan
// ("Tugas Besar Basis Data") supaya contohnya terasa masuk akal.
const STATIC_TASKS: Record<ColumnId, PreviewTask | null> = {
    pool: { id: "t1", title: "Desain ERD", meta: "Belum diklaim" },
    ongoing: { id: "t3", title: "Query & indexing", meta: "Dimas" },
    review: { id: "t4", title: "Draft laporan", meta: "Menunggu ketua" },
    done: { id: "t5", title: "Skema database", meta: "Rina" },
};

// Satu kartu "hidup" yang pelan-pelan pindah kolom. Ini satu-satunya gerakan di
// halaman ini, dan tugasnya cuma satu: menunjukkan alur klaim sampai selesai.
const TRAVELING_TASK: Record<ColumnId, PreviewTask> = {
    pool: { id: "live", title: "Normalisasi tabel", meta: "Belum diklaim" },
    ongoing: { id: "live", title: "Normalisasi tabel", meta: "Sarah" },
    review: { id: "live", title: "Normalisasi tabel", meta: "Menunggu ketua" },
    done: { id: "live", title: "Normalisasi tabel", meta: "Sarah" },
};

// Jeda (ms) sebelum papan boleh menggeser dirinya sendiri lagi setelah
// disentuh user. Tanpa ini, papan akan "melawan" jari user saat digeser manual.
const USER_SCROLL_PAUSE_MS = 6000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);

    query.addEventListener("change", callback);

    return () => {
        query.removeEventListener("change", callback);
    };
}

function getReducedMotionSnapshot() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
    return true;
}

export default function LandingBoardPreview() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isSwitching, setIsSwitching] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const pausedUntilRef = useRef(0);
    const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
);


    useEffect(() => {
        if (reducedMotion) return;

        const interval = setInterval(() => {
            setIsSwitching(true);
            timeoutRef.current = setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % COLUMN_ORDER.length);
                setIsSwitching(false);
            }, 240);
        }, 3200);

        return () => {
            clearInterval(interval);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [reducedMotion]);

    const activeColumnIndex = reducedMotion ? 1 : activeIndex;
    const activeColumn = COLUMN_ORDER[activeColumnIndex];

    // Di mobile, papan digeser horizontal — tanpa ini, kartu yang lagi jalan
    // sering berada di kolom yang sedang di luar layar, jadi animasinya
    // percuma. Papan ikut mengejar kartunya, tapi hanya kalau kolom tujuannya
    // memang belum kelihatan (biar tidak bergerak-gerak tanpa alasan).
    const followActiveColumn = useCallback(
        (index: number, behavior: ScrollBehavior) => {
            const scroller = scrollerRef.current;
            if (!scroller) return;
            if (scroller.scrollWidth <= scroller.clientWidth + 1) return;
            if (Date.now() < pausedUntilRef.current) return;

            const columns = Array.from(scroller.children) as HTMLElement[];
            const target = columns[index];
            const first = columns[0];
            if (!target || !first) return;

            const gutter = 10; // sama dengan px-2.5 di scroller
            const left = target.offsetLeft - first.offsetLeft;
            const right = left + target.offsetWidth;
            const viewLeft = scroller.scrollLeft;
            const viewRight = viewLeft + scroller.clientWidth - gutter * 2;

            if (right > viewRight) {
                scroller.scrollTo({
                    left: right - scroller.clientWidth + gutter * 2,
                    behavior,
                });
            } else if (left < viewLeft) {
                scroller.scrollTo({ left: Math.max(left, 0), behavior });
            }
        },
        []
    );

    useEffect(() => {
        followActiveColumn(
            activeColumnIndex,
            reducedMotion ? "auto" : "smooth"
        );
    }, [activeColumnIndex, followActiveColumn, reducedMotion]);

    const pauseAutoScroll = useCallback(() => {
        pausedUntilRef.current = Date.now() + USER_SCROLL_PAUSE_MS;
    }, []);

    return (
        <figure className="m-0">
            <div
                aria-hidden="true"
                className="overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(44,38,32,0.05),0_12px_28px_-18px_rgba(44,38,32,0.35)] sm:p-4"
            >
                <div className="flex items-baseline justify-between gap-3 pb-3">
                    <p className="truncate font-inter text-xs font-semibold text-foreground sm:text-sm">
                        Tugas Besar Basis Data
                    </p>
                    <p className="shrink-0 font-inter text-[11px] text-muted sm:text-xs">
                        4 tugas
                    </p>
                </div>

                {/* Mobile: kolom kanban digeser horizontal dengan scroll-snap.
                    Lebar kolom dipatok 46% supaya DUA kolom penuh muat di layar
                    dan kolom ketiga cuma menyembul tipis di tepi — itu sinyal
                    "masih ada lagi", bukan kartu yang kepotong separuh.
                    Dari sm: ke atas kembali jadi grid 4 kolom sejajar. */}
                <div className="relative -mx-3 sm:mx-0">
                    <div
                        ref={scrollerRef}
                        onPointerDown={pauseAutoScroll}
                        onTouchStart={pauseAutoScroll}
                        onWheel={pauseAutoScroll}
                        className="flex snap-x snap-mandatory scroll-pl-3 gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:gap-2.5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
                    >
                        {COLUMN_ORDER.map((columnId) => {
                            const meta = COLUMN_META[columnId];
                            const isActive = columnId === activeColumn;
                            const traveler = TRAVELING_TASK[columnId];
                            const staticTask = STATIC_TASKS[columnId];

                            return (
                                <div
                                    key={columnId}
                                    className="flex w-[46%] shrink-0 snap-start flex-col gap-2 rounded-xl bg-secondary/40 p-2 sm:w-auto sm:shrink"
                                >
                                    <div className="flex items-center gap-1.5 px-0.5">
                                        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                                        <span className="truncate font-inter text-[11px] font-medium text-muted sm:text-xs">
                                            {meta.label}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        {isActive && (
                                            <div
                                                className={cn(
                                                    "rounded-lg border border-primary/35 bg-card px-2.5 py-2 transition-all duration-300 ease-out",
                                                    isSwitching
                                                        ? "-translate-y-1 opacity-0"
                                                        : "translate-y-0 opacity-100"
                                                )}
                                            >
                                                <p className="truncate font-inter text-xs font-medium text-foreground">
                                                    {traveler.title}
                                                </p>
                                                <p className="mt-0.5 truncate font-inter text-[11px] text-primary">
                                                    {traveler.meta}
                                                </p>
                                            </div>
                                        )}

                                        {staticTask && (
                                            <div className="rounded-lg border border-border bg-card px-2.5 py-2">
                                                <p className="truncate font-inter text-xs font-medium text-foreground">
                                                    {staticTask.title}
                                                </p>
                                                <p className="mt-0.5 truncate font-inter text-[11px] text-muted">
                                                    {staticTask.meta}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Gradien tipis di tepi kanan: kolom yang menyembul memudar
                        ke warna kartu, bukan terpotong mendadak oleh border.
                        Inilah yang bikin papan tidak lagi kelihatan "mleber". */}
                    <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-card to-transparent sm:hidden" />
                </div>

                {/* Indikator titik: menandai kolom mana yang lagi dipegang kartu
                    hidup, sekaligus memberi tahu bahwa papan bisa digeser. */}
                <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
                    {COLUMN_ORDER.map((columnId) => (
                        <span
                            key={columnId}
                            className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                columnId === activeColumn
                                    ? "w-4 bg-primary"
                                    : "w-1 bg-border"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Di mobile keterangan ini cuma mengulang apa yang sudah terlihat di
                papan (label kolom + kartu yang berpindah), jadi disembunyikan
                secara visual tapi tetap dibaca screen reader — karena papannya
                sendiri aria-hidden. */}
            <figcaption className="sr-only sm:not-sr-only sm:mt-3 sm:max-w-xl sm:font-inter sm:text-sm sm:leading-relaxed sm:text-muted">
                Tugas nongkrong di Task Pool sampai diklaim, lalu jalan ke
                Dikerjakan, Ditinjau, dan Selesai.
            </figcaption>
        </figure>
    );
}
