import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/lib/api/auth/session";
import LandingHeader from "@/components/features/landing/LandingHeader";
import LandingHero from "@/components/features/landing/LandingHero";
import LandingReality from "@/components/features/landing/LandingReality";
import LandingWorkflow from "@/components/features/landing/LandingWorkflow";
import LandingFeatures from "@/components/features/landing/LandingFeatures";
import LandingRoles from "@/components/features/landing/LandingRoles";
import LandingClosingCta from "@/components/features/landing/LandingClosingCta";
import LandingFooter from "@/components/features/landing/LandingFooter";

export default async function LandingPage() {
    const user = await getSession();

    if (user) {
        redirect(ROUTES.PROJECTS);
    }

    return (
        <>
            <a
                href="#konten"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-inter focus:font-semibold focus:text-primary-foreground"
            >
                Lewati ke konten utama
            </a>

            <LandingHeader />
            <main id="konten">
                <LandingHero />
                <LandingReality />
                <LandingWorkflow />
                <LandingFeatures />
                <LandingRoles />
                <LandingClosingCta />
            </main>
            <LandingFooter />
        </>
    );
}
