import { useProject } from "@/contexts/ProjectContext";
import React from "react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen } from "lucide-react";

interface PageHeaderProps {
  children: React.ReactNode;
}

export function PageHeader({ children }: PageHeaderProps) {
  const { projects, currentProjectId, setCurrentProjectId } = useProject();
  const [location] = useLocation();

  // 仪表盘页面不显示项目切换器（仪表盘做总览）
  const isDashboard = location === "/";
  // 项目管理页面也不需要切换器
  const isProjectSettings = location === "/projects";

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {children}
        </div>
        {!isDashboard && !isProjectSettings && (
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Select
              value={currentProjectId !== null ? String(currentProjectId) : "all"}
              onValueChange={(val) => setCurrentProjectId(val === "all" ? null : Number(val))}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs border-border/60 bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="全部项目" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">全部项目</SelectItem>
                {projects.filter(p => !p.isArchived && !p.parentId).map((project) => (
                  <React.Fragment key={project.id}>
                    <SelectItem value={String(project.id)} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] shrink-0"
                          style={{ backgroundColor: project.color + "20" }}
                        >
                          {project.icon}
                        </span>
                        {project.name}
                      </div>
                    </SelectItem>
                    {projects.filter(c => !c.isArchived && c.parentId === project.id).map((child) => (
                      <SelectItem key={child.id} value={String(child.id)} className="text-xs pl-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded flex items-center justify-center text-[8px] shrink-0"
                            style={{ backgroundColor: child.color + "20" }}
                          >
                            {child.icon}
                          </span>
                          {child.name}
                        </div>
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
