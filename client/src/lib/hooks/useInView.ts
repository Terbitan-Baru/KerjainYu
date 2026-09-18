"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type UseInViewOptions = {
    /** Berapa persen elemen harus kelihatan sebelum dianggap "masuk viewport". */
    threshold?: number;
    /** Geser area deteksi; default memicu sedikit sebelum elemen benar-benar di tepi layar. */
    rootMargin?: string;
    /** Kalau true, animasi cuma jalan sekali lalu berhenti mengamati (dipakai untuk entrance animation biasa). */
    once?: boolean;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
    return false;
}

export function useInView<T extends HTMLElement>({
    threshold = 0.2,
    rootMargin = "0px 0px -10% 0px",
    once = true,
}: UseInViewOptions = {}) {
    const ref = useRef<T | null>(null);


    const [observedInView, setObservedInView] = useState(false);

    const prefersReducedMotion = useSyncExternalStore(
        subscribeReducedMotion,
        getReducedMotionSnapshot,
        getReducedMotionServerSnapshot
    );

    useEffect(() => {
        if (prefersReducedMotion) return;

        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setObservedInView(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setObservedInView(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [prefersReducedMotion, threshold, rootMargin, once]);

    const isInView = prefersReducedMotion || observedInView;

    return { ref, isInView };
}