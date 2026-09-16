"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import HelpFaqItem from "@/components/features/help/HelpFaqItem";
import { HelpCategory } from "@/lib/help/helpContent";

type HelpFaqAccordionProps = {
    categories: HelpCategory[];
};

export default function HelpFaqAccordion({ categories }: HelpFaqAccordionProps) {
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());

    function toggle(entryId: string) {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(entryId)) {
                next.delete(entryId);
            } else {
                next.add(entryId);
            }
            return next;
        });
    }

    const hasResults = categories.some((category) => category.entries.length > 0);

    if (!hasResults) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
                <SearchX className="size-8 text-muted" />
                <p className="font-inter text-sm text-muted">Tidak ada hasil yang cocok. Coba kata kunci lain.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {categories.map((category) => {
                if (category.entries.length === 0) return null;
                return (
                    <div key={category.id} className="rounded-xl border border-border bg-card">
                        <h3 className="border-b border-border px-4 py-3 font-inter text-sm font-semibold text-foreground">
                            {category.label}
                        </h3>
                        <div className="divide-y divide-border">
                            {category.entries.map((entry) => (
                                <HelpFaqItem
                                    key={entry.id}
                                    entry={entry}
                                    isOpen={openIds.has(entry.id)}
                                    onToggle={() => toggle(entry.id)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
