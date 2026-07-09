# Phase 47 Progress Notes

## Completed:
1. Sidebar navigation reordered: 任务看板 → 项目管理 → 项目架构需求图 → 项目文档 → 反馈中心 → 飞书推送
2. "迭代周期" removed from sidebar
3. "团队成员" moved to account dropdown menu (footer area)
4. "项目管理" added to workspace group with FolderOpen icon, path="/projects"
5. Backend getMergedForParent now returns `docId` instead of `merged` content - it auto-creates a real architecture doc for parent projects

## Remaining:
- Update MergedArchitecture.tsx frontend to redirect to ArchitectureEditor using the returned docId
- The route /architecture/merged/:projectId should now fetch the docId and redirect to /architecture/:docId
- Need to verify TypeScript compiles cleanly

## Key Architecture Decision:
- Parent project's merged architecture is now a REAL architecture_docs row (with projectId = parent project id)
- First access auto-creates it from merged child content
- After creation, it's fully editable like any other architecture doc
- The getMergedForParent API now returns { docId, parentName, children } instead of { merged, parentName, children }
