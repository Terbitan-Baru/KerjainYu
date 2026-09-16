import { notFound } from "next/navigation";
import { getProject } from "@/lib/api/projects/projects";
import SettingsHeader from "@/components/features/settings/SettingsHeader";
import GeneralSettingsCard from "@/components/features/settings/GeneralSettingsCard";
import ProjectStatusCard from "@/components/features/settings/ProjectStatusCard";
import ArchiveProjectCard from "@/components/features/settings/ArchiveProjectCard";
import DeleteProjectCard from "@/components/features/settings/DeleteProjectCard";

type SettingsPageProps = {
    params: Promise<{ projectId: string }>;
};

/** Format tanggal ISO dari server menjadi YYYY-MM-DD untuk input type="date". */
function toDateInputValue(deadline: string): string {
    return deadline.slice(0, 10);
}

export default async function SettingsPage({ params }: SettingsPageProps) {
    const { projectId } = await params;

    const detail = await getProject(projectId);
    if (!detail) {
        notFound();
    }

    const { project, membership } = detail;
    const canManage = membership.role === "leader";

    return (
        <div className="flex flex-col gap-5 pb-8">
            <SettingsHeader projectTitle={project.title} />

            <GeneralSettingsCard
                projectId={projectId}
                canManage={canManage}
                initialValues={{
                    title: project.title,
                    deadline: toDateInputValue(project.deadline),
                    allowFreeSwap: project.allowFreeSwap,
                }}
            />

            <ProjectStatusCard
                projectId={projectId}
                projectTitle={project.title}
                status={project.status}
                canManage={canManage}
            />

            <ArchiveProjectCard
                projectId={projectId}
                projectTitle={project.title}
                isArchived={project.isArchived}
                canManage={canManage}
            />

            <DeleteProjectCard
                projectId={projectId}
                projectTitle={project.title}
                canManage={canManage}
            />
        </div>
    );
}