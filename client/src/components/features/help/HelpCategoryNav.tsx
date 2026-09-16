"use client";

import { cn } from "@/utils/cn";
import { HelpCategory } from "@/lib/help/helpContent";

type HelpCategoryNavProps = {
    categories: HelpCategory[];
    activeCategory: string | "all";
    onChange: (categoryId: string | "all") => void;
};

export default function HelpCategoryNav({ categories, activeCategory, onChange }: HelpCategoryNavProps) {
    const items: { id: string | "all"; label: string }[] = [
        { id: "all", label: "Semua" },
        ...categories.map((category) => ({ id: category.id, label: category.label })),
    ];

    return (
        <nav aria-label="Kategori bantuan" className="lg:w-56 lg:shrink-0">
            {/* Mobile / tablet: chip row horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 pr-4 lg:hidden">
                {items.map((item) => {
                    const isActive = item.id === activeCategory;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChange(item.id)}
                            aria-current={isActive ? "true" : undefined}
                            className={cn(
                                "min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-inter font-medium transition-colors",
                                isActive
                                    ? "border-transparent bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground hover:border-primary/50"
                            )}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden flex-col gap-1 lg:flex">
                {items.map((item) => {
                    const isActive = item.id === activeCategory;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChange(item.id)}
                            aria-current={isActive ? "true" : undefined}
                            className={cn(
                                "rounded-lg px-3 py-2 text-left text-sm font-inter font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground hover:bg-status-todo-bg"
                            )}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
