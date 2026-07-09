import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Shield, User, Clock } from "lucide-react";

export default function Members() {
  const { data: members, isLoading } = trpc.auth.allUsers.useQuery();

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">团队成员</h1>
            <p className="text-xs text-muted-foreground">共 {members?.length || 0} 位成员</p>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p>暂无成员</p>
            <p className="text-sm mt-1">分享系统链接邀请团队成员登录加入</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {member.name || "未命名用户"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 ${getRoleColor(member.role)}`}
                    >
                      {member.role === "admin" ? (
                        <><Shield className="h-3 w-3 mr-0.5" />管理员</>
                      ) : (
                        <><User className="h-3 w-3 mr-0.5" />成员</>
                      )}
                    </Badge>
                  </div>
                  {member.email && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {member.email}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>最近活跃</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(member.lastSignedIn)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-dashed border-border">
          <p className="text-sm text-muted-foreground text-center">
            💡 将系统链接分享给团队成员，他们登录后将自动加入团队
          </p>
        </div>
      </div>
    </div>
  );
}
