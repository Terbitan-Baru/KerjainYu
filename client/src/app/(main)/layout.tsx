import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/lib/api/auth/session";
import { SessionProvider } from "@/contexts/SessionContext";
import { ProjectTitleProvider } from "@/contexts/ProjectTitleContext";
import { NotificationCountProvider } from "@/contexts/NotificationCountContext";
import { getUnreadNotificationCountAction } from "@/app/(main)/notifications/actions";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | KerjainYu",
    default: "KerjainYu",
  },
  description: "Kolaborasi tugas tim: bagi tugas, klaim dari task pool, tukar tugas, dan review hasil kerja di satu tempat.",
};

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const initialUnreadCount = await getUnreadNotificationCountAction();

  return (
    <SessionProvider user={user}>
      <ProjectTitleProvider>
        <NotificationCountProvider initialCount={initialUnreadCount}>
          <ResponsiveLayout user={user}>
            <div className="px-4 mt-2 h-full">
              {children}
            </div>
          </ResponsiveLayout>
        </NotificationCountProvider>
      </ProjectTitleProvider>
    </SessionProvider>
  );
}