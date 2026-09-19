import { getMyNotificationsAction } from "@/app/(main)/notifications/actions";
import NotificationsPageClient from "@/components/features/notifications/NotificationsPageClient";

export default async function NotificationsPage() {
  const summary = await getMyNotificationsAction();

  return (
    <>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">Notifikasi</h2>
      <div className="mt-4 md:mx-auto md:max-w-2xl">
        <NotificationsPageClient initialSummary={summary} />
      </div>
    </>
  );
}
