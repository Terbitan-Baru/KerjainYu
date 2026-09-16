"use client";

import { useMemo, useState } from "react";
import HelpSearchBar from "@/components/features/help/HelpSearchBar";
import HelpCategoryNav from "@/components/features/help/HelpCategoryNav";
import HelpFaqAccordion from "@/components/features/help/HelpFaqAccordion";
import { HELP_CATEGORIES } from "@/lib/help/helpContent";

export default function HelpCenterView() {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | "all">("all");

    const visibleCategories = useMemo(() => {
        const query = search.trim().toLowerCase();

        // Kalau ada query pencarian, cari di semua kategori sekaligus
        // (mengabaikan filter kategori) — lebih sederhana bagi user.
        if (query) {
            return HELP_CATEGORIES.map((category) => ({
                ...category,
                entries: category.entries.filter(
                    (entry) =>
                        entry.question.toLowerCase().includes(query) ||
                        entry.answer.toLowerCase().includes(query)
                ),
            }));
        }

        if (activeCategory === "all") return HELP_CATEGORIES;

        return HELP_CATEGORIES.filter((category) => category.id === activeCategory);
    }, [search, activeCategory]);

    return (
        <div className="flex flex-col gap-4">
            <HelpSearchBar value={search} onChange={setSearch} />

            <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                <HelpCategoryNav
                    categories={HELP_CATEGORIES}
                    activeCategory={activeCategory}
                    onChange={setActiveCategory}
                />

                <div className="lg:flex-1">
                    <HelpFaqAccordion categories={visibleCategories} />
                </div>
            </div>

            <p className="mt-2 text-center text-sm font-inter text-muted">
                Belum menemukan jawaban? Coba tanyakan langsung ke Ketua atau anggota tim proyekmu.
            </p>
        </div>
    );
}
