import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Bell,
  BookOpen,
  ChevronRight,
  CircleDot,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  Sparkles,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Separator } from "./ui/separator";

const navMain = [
  {
    label: "仪表盘",
    icon: LayoutDashboard,
    path: "/",
  },
];

const navWorkspace = [
  {
    label: "任务看板",
    icon: CircleDot,
    path: "/issues",
  },
  {
    label: "项目管理",
    icon: FolderOpen,
    path: "/projects",
  },
  {
    label: "项目架构需求图",
    icon: Network,
    path: "/architecture",
  },
  {
    label: "项目文档",
    icon: BookOpen,
    path: "/wiki",
  },
  {
    label: "反馈中心",
    icon: MessageSquare,
    path: "/feedback",
  },
  {
    label: "飞书推送",
    icon: Bell,
    path: "/feishu",
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50">
          {/* Header */}
          <SidebarHeader className="h-14 px-4 flex flex-row items-center gap-2.5 border-b border-border/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold tracking-tight truncate">团队协作</span>
                <span className="text-[10px] text-muted-foreground">工作空间</span>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {/* Main nav */}
            <SidebarGroup className="px-2 py-1">
              <SidebarMenu>
                {navMain.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 rounded-lg font-normal text-sm"
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {!isCollapsed && (
              <div className="px-4 py-1">
                <Separator className="bg-border/50" />
              </div>
            )}

            {/* Workspace nav */}
            <SidebarGroup className="px-2 py-1">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                  工作区
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {navWorkspace.map((item) => {
                  const isActive = location.startsWith(item.path) && (item.path !== "/" || location === "/");
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 rounded-lg font-normal text-sm"
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{item.label}</span>
                        {isActive && !isCollapsed && (
                          <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/40" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-2 border-t border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/60 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 border border-border/60 shrink-0">
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-none">{user?.name || "User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.role === "admin" ? "管理员" : "成员"}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" sideOffset={4}>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/members")} className="cursor-pointer text-xs">
                  <Users className="mr-2 h-3.5 w-3.5" />
                  团队成员
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive text-xs"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {isMobile && (
          <div className="flex border-b h-12 items-center px-3 bg-background/95 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger className="h-8 w-8 rounded-lg" />
          </div>
        )}
        <main className="flex-1 min-h-screen flex flex-col">{children}</main>
      </SidebarInset>
    </>
  );
}
