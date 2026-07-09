import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: "planning" | "in_progress" | "completed";
  deadline: Date | null;
  parentId: number | null;
  createdBy: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectContextType {
  projects: Project[];
  currentProjectId: number | null;
  currentProject: Project | undefined;
  setCurrentProjectId: (id: number | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProjectId: null,
  currentProject: undefined,
  setCurrentProjectId: () => {},
  isLoading: false,
  refetch: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem("currentProjectId");
    return stored ? Number(stored) : null;
  });

  const { data: projects = [], isLoading, refetch } = trpc.projects.list.useQuery({});

  const setCurrentProjectId = (id: number | null) => {
    setCurrentProjectIdState(id);
    if (id !== null) {
      localStorage.setItem("currentProjectId", String(id));
    } else {
      localStorage.removeItem("currentProjectId");
    }
  };

  // If stored project no longer exists, reset
  useEffect(() => {
    if (!isLoading && projects.length > 0 && currentProjectId !== null) {
      const exists = projects.some((p) => p.id === currentProjectId);
      if (!exists) {
        setCurrentProjectId(null);
      }
    }
  }, [projects, isLoading, currentProjectId]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <ProjectContext.Provider
      value={{
        projects: projects as Project[],
        currentProjectId,
        currentProject,
        setCurrentProjectId,
        isLoading,
        refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
