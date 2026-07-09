import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Search, FileText, Users, ChevronRight, GitBranch, BarChart3, Rocket, Code2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";

const CATEGORIES = ["产品", "研发", "设计", "人事", "通用"];

type TemplateType = "none" | "prd" | "meeting" | "flow" | "competitive" | "release" | "tech_design";

const TEMPLATES: Record<TemplateType, { label: string; icon: any; description: string; content?: string }> = {
  none: { label: "空白文档", icon: FileText, description: "从头开始创建" },
  prd: {
    label: "PRD 模板",
    icon: FileText,
    description: "产品需求文档",
    content: `# 产品需求文档（PRD）

## 一、背景与目标
**背景**
描述该功能的背景与立项原因。

**目标**
本次迭代希望达成的核心目标。

**目标用户**
该功能的主要使用人群是谁？

**成功指标**
- 指标 1：...
- 指标 2：...

## 二、功能范围
**纳入范围**
- 功能 A
- 功能 B

**不纳入范围**
- 功能 C

## 三、用户故事
| 作为... | 我希望... | 以便... |
|---------|----------|--------|
| 用户 | ... | ... |

## 四、设计与资产
- Figma 链接：[添加链接]

## 五、技术方案
描述技术实现思路与架构设计。

## 六、排期计划
- 设计：第 1 周
- 开发：第 2-3 周
- 测试：第 4 周
`,
  },
  meeting: {
    label: "会议记录",
    icon: Users,
    description: "会议议程与行动项",
    content: `# 会议记录

**日期：** ${new Date().toLocaleDateString("zh-CN")}
**参会人：** 

---

## 议程
1. 议题一
2. 议题二
3. 议题三

## 会议纪要
### 议题一
...

### 议题二
...

## 行动项
- [ ] 任务 1（负责人：@xxx）截止日期：
- [ ] 任务 2（负责人：@xxx）截止日期：

## 下次会议
日期：
`,
  },
  flow: {
    label: "产品流程图",
    icon: GitBranch,
    description: "用户流程与业务流程",
    content: `# 产品流程图文档

## 一、流程概述
**流程名称：** 
**所属模块：** 
**最后更新：** ${new Date().toLocaleDateString("zh-CN")}

---

## 二、核心用户流程

### 2.1 主流程
\`\`\`
[起点] → [步骤1] → [判断条件] → [步骤2A] / [步骤2B] → [终点]
\`\`\`

**流程说明：**
| 步骤 | 操作描述 | 触发条件 | 输出结果 |
|------|---------|---------|---------|
| 1 | ... | ... | ... |
| 2 | ... | ... | ... |

### 2.2 异常流程
- 异常场景 1：...
- 异常场景 2：...

## 三、业务规则
1. 规则 1：...
2. 规则 2：...

## 四、接口依赖
| 接口名称 | 请求方式 | 说明 |
|---------|---------|------|
| ... | GET/POST | ... |

## 五、状态流转
| 当前状态 | 触发事件 | 目标状态 |
|---------|---------|---------|
| ... | ... | ... |
`,
  },
  competitive: {
    label: "竞品分析",
    icon: BarChart3,
    description: "竞品对比与分析报告",
    content: `# 竞品分析报告

## 一、分析背景
**分析目的：** 
**分析日期：** ${new Date().toLocaleDateString("zh-CN")}
**分析人：** 

---

## 二、竞品概览
| 维度 | 我方产品 | 竞品 A | 竞品 B | 竞品 C |
|------|---------|--------|--------|--------|
| 定位 | | | | |
| 目标用户 | | | | |
| 核心功能 | | | | |
| 定价策略 | | | | |
| 市场份额 | | | | |

## 三、功能对比
### 3.1 核心功能矩阵
| 功能点 | 我方 | 竞品A | 竞品B | 备注 |
|--------|------|-------|-------|------|
| 功能1 | ✅ | ✅ | ❌ | |
| 功能2 | ❌ | ✅ | ✅ | |

### 3.2 用户体验对比
- **交互设计：** ...
- **视觉风格：** ...
- **性能表现：** ...

## 四、SWOT 分析
| | 正面 | 负面 |
|---|------|------|
| **内部** | 优势(S)：... | 劣势(W)：... |
| **外部** | 机会(O)：... | 威胁(T)：... |

## 五、策略建议
1. 短期（1个月内）：...
2. 中期（1-3个月）：...
3. 长期（3个月以上）：...

## 六、结论
...
`,
  },
  release: {
    label: "版本发布说明",
    icon: Rocket,
    description: "Release Notes 模板",
    content: `# 版本发布说明

## 版本信息
- **版本号：** v1.0.0
- **发布日期：** ${new Date().toLocaleDateString("zh-CN")}
- **发布类型：** 🟢 正式发布 / 🟡 预发布 / 🔴 热修复

---

## ✨ 新增功能
- **功能名称 1**：功能描述，解决了什么问题
- **功能名称 2**：功能描述

## 🐛 Bug 修复
- 修复了 xxx 场景下 xxx 的问题
- 修复了 xxx 导致 xxx 异常的问题

## 🔧 优化改进
- 优化了 xxx 的性能，提升 xx%
- 改进了 xxx 的交互体验

## ⚠️ 已知问题
- 问题描述 1（预计下版本修复）
- 问题描述 2

## 📋 升级指南
### 前置条件
- ...

### 升级步骤
1. ...
2. ...

### 回滚方案
- ...

## 🙏 致谢
感谢以下团队成员对本版本的贡献：
- @成员1 - 功能开发
- @成员2 - 测试验证
`,
  },
  tech_design: {
    label: "技术方案",
    icon: Code2,
    description: "技术架构设计文档",
    content: `# 技术方案设计文档

## 一、概述
**项目名称：** 
**文档版本：** v1.0
**作者：** 
**日期：** ${new Date().toLocaleDateString("zh-CN")}

---

## 二、需求背景
简要描述业务需求和技术背景。

## 三、系统架构
### 3.1 整体架构图
\`\`\`
[客户端] → [API Gateway] → [服务层] → [数据层]
\`\`\`

### 3.2 技术选型
| 层级 | 技术方案 | 选型理由 |
|------|---------|---------|
| 前端 | | |
| 后端 | | |
| 数据库 | | |
| 缓存 | | |
| 消息队列 | | |

## 四、详细设计
### 4.1 数据模型
\`\`\`sql
-- 核心表结构
CREATE TABLE xxx (
  id INT PRIMARY KEY,
  ...
);
\`\`\`

### 4.2 接口设计
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建 | POST | /api/xxx | ... |
| 查询 | GET | /api/xxx | ... |

### 4.3 核心流程
1. 步骤 1：...
2. 步骤 2：...

## 五、性能方案
- **预期 QPS：** 
- **响应时间：** P99 < xxxms
- **优化策略：** 缓存/分库分表/异步处理

## 六、安全设计
- 认证方式：...
- 权限控制：...
- 数据加密：...

## 七、监控与告警
- 核心指标：...
- 告警规则：...

## 八、风险评估
| 风险点 | 影响程度 | 应对方案 |
|--------|---------|---------|
| ... | 高/中/低 | ... |

## 九、排期与里程碑
| 阶段 | 时间 | 交付物 |
|------|------|--------|
| 设计评审 | | 本文档 |
| 开发 | | 代码 |
| 联调 | | 接口对接 |
| 测试 | | 测试报告 |
| 上线 | | 发布 |
`,
  },
};

const TEMPLATE_BADGE_MAP: Record<string, string> = {
  prd: "PRD",
  meeting: "会议",
  flow: "流程图",
  competitive: "竞品分析",
  release: "发布说明",
  tech_design: "技术方案",
};

export default function WikiList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTemplate, setNewTemplate] = useState<TemplateType>("none");

  const { currentProjectId } = useProject();
  const { data: docs, isLoading } = trpc.wiki.list.useQuery({ projectId: currentProjectId });
  const utils = trpc.useUtils();

  const createDoc = trpc.wiki.create.useMutation({
    onSuccess: async () => {
      await utils.wiki.list.invalidate();
      const docs = await utils.wiki.list.fetch();
      const latest = docs[0];
      if (latest) {
        setShowCreate(false);
        setNewTitle("");
        setNewCategory("");
        setNewTemplate("none");
        setLocation(`/wiki/${latest.id}`);
      }
    },
    onError: () => toast.error("创建文档失败"),
  });

  const filtered = docs?.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.category?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered?.reduce(
    (acc, doc) => {
      const cat = doc.category || "通用";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, typeof filtered>
  );

  return (
    <div className="page-enter">
      <PageHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">Wiki 文档</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">团队知识库与文档中心</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            新建文档
          </Button>
        </div>
      </PageHeader>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索文档..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-muted/40 border-border/60 focus:bg-background"
        />
      </div>

      {/* 文档列表 */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped ?? {}).map(([category, categoryDocs]) => (
            <div key={category}>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">
                {category}
              </h2>
              <div className="space-y-1">
                {categoryDocs?.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setLocation(`/wiki/${doc.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group card-elegant hover-lift"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        更新于 {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: zhCN })}
                      </p>
                    </div>
                    {doc.templateType && doc.templateType !== "none" && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-2 shrink-0">
                        {TEMPLATE_BADGE_MAP[doc.templateType] || doc.templateType}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "未找到匹配的文档" : "暂无文档"}
          </p>
          {!search && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => setShowCreate(true)}
            >
              创建第一篇文档
            </Button>
          )}
        </div>
      )}

      {/* 新建文档弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">新建文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">标题</Label>
              <Input
                placeholder="文档标题..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">分类</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择分类..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium">选择模板</Label>
              {/* 基础模板 */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">基础</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["none", "meeting"] as TemplateType[]).map((key) => {
                    const tmpl = TEMPLATES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setNewTemplate(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          newTemplate === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/40 hover:bg-accent/50"
                        }`}
                      >
                        <tmpl.icon className={`h-4 w-4 mb-1.5 ${newTemplate === key ? "text-primary" : "text-muted-foreground"}`} />
                        <p className={`text-[11px] font-medium leading-tight ${newTemplate === key ? "text-primary" : "text-foreground"}`}>
                          {tmpl.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 产品模板 */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">产品</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(["prd", "flow", "competitive", "release"] as TemplateType[]).map((key) => {
                    const tmpl = TEMPLATES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setNewTemplate(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          newTemplate === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/40 hover:bg-accent/50"
                        }`}
                      >
                        <tmpl.icon className={`h-4 w-4 mb-1.5 ${newTemplate === key ? "text-primary" : "text-muted-foreground"}`} />
                        <p className={`text-[11px] font-medium leading-tight ${newTemplate === key ? "text-primary" : "text-foreground"}`}>
                          {tmpl.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 技术模板 */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">技术</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["tech_design"] as TemplateType[]).map((key) => {
                    const tmpl = TEMPLATES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setNewTemplate(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          newTemplate === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/40 hover:bg-accent/50"
                        }`}
                      >
                        <tmpl.icon className={`h-4 w-4 mb-1.5 ${newTemplate === key ? "text-primary" : "text-muted-foreground"}`} />
                        <p className={`text-[11px] font-medium leading-tight ${newTemplate === key ? "text-primary" : "text-foreground"}`}>
                          {tmpl.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button
              size="sm"
              disabled={!newTitle.trim() || createDoc.isPending}
              onClick={() =>
                createDoc.mutate({
                  title: newTitle.trim(),
                  category: newCategory || undefined,
                  templateType: newTemplate,
                  content: newTemplate !== "none" ? TEMPLATES[newTemplate].content ?? "" : "",
                  projectId: currentProjectId,
                })
              }
            >
              {createDoc.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
