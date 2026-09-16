"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { HelpFaqEntry } from "@/lib/help/helpContent";

type HelpFaqItemProps = {
    entry: HelpFaqEntry;
    isOpen: boolean;
    onToggle: () => void;
};

export default function HelpFaqItem({ entry, isOpen, onToggle }: HelpFaqItemProps) {
    const panelId = `help-faq-answer-${entry.id}`;
    const buttonId = `help-faq-question-${entry.id}`;

    return (
        <div>
            <button
                id={buttonId}
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-status-todo-bg"
            >
                <span className="text-sm font-inter font-medium text-foreground">{entry.question}</span>
                <ChevronDown
                    className={cn("size-3.5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
                    aria-hidden="true"
                />
            </button>
            {isOpen && (
                <div id={panelId} role="region" aria-labelledby={buttonId} className="px-4 pb-4">
                    <p className="whitespace-pre-wrap text-sm font-inter text-muted">{entry.answer}</p>
                </div>
            )}
        </div>
    );
}
