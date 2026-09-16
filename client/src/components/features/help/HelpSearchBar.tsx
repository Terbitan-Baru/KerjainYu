"use client";

import { Search } from "lucide-react";

type HelpSearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function HelpSearchBar({ value, onChange }: HelpSearchBarProps) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
                id="help-search"
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Cari di pusat bantuan..."
                aria-label="Cari di pusat bantuan"
                className="min-h-9 w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm font-inter text-foreground placeholder:text-muted focus:border-primary focus:outline-none lg:rounded-full lg:py-0"
            />
        </div>
    );
}
