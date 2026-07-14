import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotFound from "@/pages/NotFound";
import { Mail } from "lucide-react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import DashboardLayout from "./components/DashboardLayout";
import { TRPCClientError } from "@trpc/client";
import Dashboard from "./pages/Dashboard";
import WikiList from "./pages/WikiList";
import WikiEditor from "./pages/WikiEditor";
import IssueBoard from "./pages/IssueBoard";
import CycleList from "./pages/CycleList";
import CycleDetail from "./pages/CycleDetail";
import FeedbackHub from "./pages/FeedbackHub";
import ProjectSettings from "./pages/ProjectSettings";
import Members from "./pages/Members";
import FeishuSettings from "./pages/FeishuSettings";
import Architecture, { ArchitectureEditor } from "./pages/Architecture";
import ArchitectureOverview from "./pages/ArchitectureOverview";
import MergedArchitecture from "./pages/MergedArchitecture";
import ProjectOverview from "./pages/ProjectOverview";
import { useAuth } from "./_core/hooks/useAuth";
import { FormEvent, useState } from "react";

function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full border-2 border-current border-r-transparent animate-spin ${className}`}
    />
  );
}

function EmailLogin() {
  const { loginWithEmail, error, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      await loginWithEmail(normalizedEmail);
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "BAD_REQUEST") {
        setLocalError("请输入有效邮箱后重试");
        return;
      }
      setLocalError("登录失败，请检查服务或稍后重试");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">邮箱登录</h1>
          <p className="text-sm text-muted-foreground">
            输入团队成员邮箱即可进入工作区。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-login">邮箱</Label>
          <Input
            id="email-login"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              setLocalError(null);
            }}
            required
          />
        </div>

        {(localError || error) && (
          <p className="text-sm text-destructive">
            {localError || error?.message || "登录失败"}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <InlineSpinner className="h-4 w-4" /> : null}
          直接登录
        </Button>
      </form>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <InlineSpinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">加载工作空间…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <EmailLogin />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGate>
      <ProjectProvider>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/wiki" component={WikiList} />
            <Route path="/wiki/:id" component={WikiEditor} />
            <Route path="/issues" component={IssueBoard} />
            <Route path="/cycles" component={CycleList} />
            <Route path="/cycles/:id" component={CycleDetail} />
            <Route path="/feedback" component={FeedbackHub} />
            <Route path="/projects" component={ProjectSettings} />
            <Route path="/projects/:id">{(params) => <ProjectOverview projectId={Number(params.id)} />}</Route>
            <Route path="/members" component={Members} />
            <Route path="/feishu" component={FeishuSettings} />
            <Route path="/architecture" component={ArchitectureOverview} />
            <Route path="/architecture/merged/:projectId">{(params) => <MergedArchitecture projectId={Number(params.projectId)} />}</Route>
            <Route path="/architecture/:id">{(params) => <ArchitectureEditor id={Number(params.id)} />}</Route>
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </ProjectProvider>
    </AuthGate>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
