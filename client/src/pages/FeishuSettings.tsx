import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Bell, Send, ExternalLink, Trash2 } from "lucide-react";

export default function FeishuSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [name, setName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: webhook, refetch } = trpc.feishu.get.useQuery();

  useEffect(() => {
    if (webhook) {
      setWebhookUrl(webhook.webhookUrl);
      setName(webhook.name ?? "");
    }
  }, [webhook]);

  const setMutation = trpc.feishu.set.useMutation({
    onSuccess: () => {
      toast.success("飞书 Webhook 绑定成功");
      setEditing(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.feishu.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.feishu.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook 已解绑");
      setDeleteOpen(false);
      setWebhookUrl("");
      setName("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.feishu.test.useMutation({
    onSuccess: () => toast.success("测试消息已发送，请检查飞书"),
    onError: (err) => toast.error(err.message),
  });

  const hasBound = !!webhook;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          个人飞书推送
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          绑定你的飞书 Webhook，当有任务指派给你时自动推送通知到飞书
        </p>
      </div>

      {/* 使用说明 - 可折叠图文指引 */}
      <Card className="p-4 mb-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <details className="group">
          <summary className="text-sm font-medium cursor-pointer select-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90">▶</span>
            如何获取飞书 Webhook 地址？（点击展开图文教程）
          </summary>
          <div className="mt-4 space-y-5">
            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span className="text-sm font-medium">新建群聊</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">打开飞书，点击左上角「+」按钮，选择「创建群组」</p>
              <img src="/manus-storage/feishu-step1_89004db8.webp" alt="新建群聊" className="ml-8 rounded-lg border shadow-sm max-w-full h-auto max-h-48 object-contain" />
            </div>
            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span className="text-sm font-medium">点开设置</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">进入群聊后，点击右上角「...」菜单，选择「设置」</p>
              <img src="/manus-storage/feishu-step2_81f08b0f.webp" alt="点开设置" className="ml-8 rounded-lg border shadow-sm max-w-full h-auto max-h-48 object-contain" />
            </div>
            {/* Step 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                <span className="text-sm font-medium">点击群机器人</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">在设置面板中找到并点击「群机器人」选项</p>
              <img src="/manus-storage/feishu-step3_eb087916.webp" alt="点击群机器人" className="ml-8 rounded-lg border shadow-sm max-w-full h-auto max-h-48 object-contain" />
            </div>
            {/* Step 4 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">4</span>
                <span className="text-sm font-medium">点击添加机器人</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">点击右上角「添加机器人」按钮，选择「自定义机器人」</p>
              <img src="/manus-storage/feishu-step4_3a9c5765.webp" alt="添加机器人" className="ml-8 rounded-lg border shadow-sm max-w-full h-auto max-h-48 object-contain" />
            </div>
            {/* Step 5 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">5</span>
                <span className="text-sm font-medium">复制 Webhook 地址</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">在弹出的机器人详情中，复制「Webhook 地址」字段的内容，粘贴到下方输入框即可</p>
              <img src="/manus-storage/feishu-step5_c783955a.webp" alt="复制Webhook" className="ml-8 rounded-lg border shadow-sm max-w-full h-auto max-h-48 object-contain" />
            </div>
          </div>
        </details>
        <a
          href="https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-3 inline-flex items-center gap-1"
        >
          查看飞书官方文档 <ExternalLink className="h-3 w-3" />
        </a>
      </Card>

      {/* 绑定状态 */}
      {hasBound && !editing ? (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">{webhook.name || "我的飞书通知"}</span>
              <Badge variant={webhook.enabled ? "default" : "secondary"} className="text-[10px]">
                {webhook.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
            <Switch
              checked={webhook.enabled}
              onCheckedChange={(checked) => updateMutation.mutate({ enabled: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4 truncate">{webhook.webhookUrl}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              修改配置
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!webhook.enabled || testMutation.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {testMutation.isPending ? "发送中..." : "发送测试"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              解绑
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="text-sm font-medium mb-4">{hasBound ? "修改 Webhook 配置" : "绑定飞书 Webhook"}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">名称（可选）</Label>
              <Input
                placeholder="例如：我的通知"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Webhook 地址 *</Label>
              <Input
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {hasBound && (
                <Button variant="outline" onClick={() => { setEditing(false); setWebhookUrl(webhook.webhookUrl); setName(webhook.name ?? ""); }}>
                  取消
                </Button>
              )}
              <Button
                disabled={!webhookUrl.trim() || setMutation.isPending}
                onClick={() => setMutation.mutate({ webhookUrl, name: name || undefined })}
              >
                {setMutation.isPending ? "保存中..." : hasBound ? "保存修改" : "绑定"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 推送事件说明 */}
      <Card className="p-4 mt-6">
        <h3 className="text-sm font-medium mb-2">推送事件（仅推送与你相关的消息）</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">📌 新任务指派</Badge>
            <span>有人将任务指派给你时推送</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">🔄 指派变更</Badge>
            <span>任务被重新指派给你时推送</span>
          </div>
        </div>
      </Card>

      {/* 解绑确认 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑</AlertDialogTitle>
            <AlertDialogDescription>
              解绑后将不再向你的飞书推送任何通知消息，你可以随时重新绑定。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              确认解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
