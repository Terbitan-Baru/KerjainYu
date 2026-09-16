"use client";

import { useMemo, useState } from "react";
import { Archive, SearchX } from "lucide-react";
import { Project } from "@/types/project";
import ArchiveProjectCard from "@/components/features/archive/ArchiveProjectCard";
import ArchiveFilterBar from "@/components/features/archive/ArchiveFilterBar";
import ProjectSearchBar from "@/components/features/projects/ProjectSearchBar";
import {
    DEFAULT_ARCHIVE_FILTERS,
    ArchiveFilters,
    matchesArchiveFilters,
} from "@/app/(main)/archive/filters";

type ArchiveProjectListProps = {
    projects: Project[];
    currentUserId: number | null;
};

function canManageProject(project: Project, currentUserId: number | null): boolean {
    if (currentUserId === null) return false;
    return project.members.some(
        (member) => member.userId === currentUserId && member.role === "leader",
    );
}

export default function ArchiveProjectList({ projects, currentUserId }: ArchiveProjectListProps) {
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<ArchiveFilters>(DEFAULT_ARCHIVE_FILTERS);

    const filteredProjects = useMemo(() => {
        const query = search.trim().toLowerCase();
        return projects.filter((project) => {
            const matchesSearch = !query || project.title.toLowerCase().includes(query);
            return matchesSearch && matchesArchiveFilters(project, filters);
        });
    }, [projects, search, filters]);

    // Belum pernah ada proyek yang diarsipkan sama sekali — beda pesan
    // dengan "hasil pencarian/filter kosong" agar user tidak bingung
    // mengira semua proyeknya hilang.
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
                <Archive className="size-8 text-muted" />
                <p className="font-inter text-sm font-medium text-foreground">Belum ada proyek yang diarsipkan</p>
                <p className="max-w-xs font-inter text-sm text-muted">
                    Proyek yang kamu arsipkan dari halaman pengaturan akan muncul di sini.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 md:items-start md:gap-4 lg:items-end">
                <div className="min-w-0 flex-1 lg:max-w-sm lg:flex-none">
                    <ProjectSearchBar value={search} onChange={setSearch} />
                </div>
                <ArchiveFilterBar filters={filters} onChange={setFilters} />
            </div>

            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
                    <SearchX className="size-8 text-muted" />
                    <p className="font-inter text-sm text-muted">Tidak ada proyek arsip yang cocok</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <ArchiveProjectCard
                            key={project.id}
                            project={project}
                            canManage={canManageProject(project, currentUserId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
