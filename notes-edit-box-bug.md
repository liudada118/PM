# Bug: 内联编辑输入框在画布平移时不跟随节点移动

## 根因分析

### TextEdit.js (simple-mind-map/src/core/render/TextEdit.js)
- 编辑框使用 `position: fixed` 定位 (line 317)
- 编辑框位置通过 `getBoundingClientRect()` 获取节点文本 DOM 的屏幕坐标 (line 246)
- `onScale()` (line 282-297) 监听了 `scale` 事件，会重新定位编辑框
- **但没有监听 `translate` 或 `view_data_change` 事件**，所以平移时编辑框不会跟随
- `updateTextEditNode()` (line 420-435) 可以重新定位编辑框（通过 getBoundingClientRect）

### View.js (simple-mind-map/src/core/view/View.js)
- 拖拽平移时调用 `transform()` (line 56)
- `transform()` 会 emit `view_data_change` (line 232)
- 但 TextEdit 没有监听这个事件
- `emitEvent('scale')` 会 fall through 到 `translate`（line 440-443），但 drag 时不调用 emitEvent
- 拖拽时 `firstDrag` 会触发 `CLEAR_ACTIVE_NODE` (line 50-52)
- `CLEAR_ACTIVE_NODE` 不会触发 `before_node_active`，所以不会自动隐藏编辑框

### 关键发现
- 当用户新建节点后自动进入编辑模式（enableAutoEnterTextEditWhenInsertNode: true）
- 此时如果用户拖拽画布平移，编辑框不会跟随
- `CLEAR_ACTIVE_NODE` 命令清除激活节点但不触发 `before_node_active` 事件
- 所以 TextEdit 的 `before_node_active` 监听器不会被调用来隐藏编辑框

## 修复方案

**方案 A（推荐）：在 ArchitectureMarkmap.tsx 中监听 `view_data_change` 事件，当编辑框可见时隐藏它**

在 mindMap 初始化后添加事件监听：
```js
mindMap.on('view_data_change', () => {
  if (mindMap.textEdit && mindMap.textEdit.showTextEdit) {
    mindMap.textEdit.hideEditTextBox();
  }
});
```

这样平移时会自动提交编辑并隐藏输入框。

**方案 B：在 ArchitectureMarkmap.tsx 中监听 `view_data_change` 事件，重新定位编辑框**

```js
mindMap.on('view_data_change', () => {
  if (mindMap.textEdit && mindMap.textEdit.showTextEdit) {
    mindMap.textEdit.updateTextEditNode();
  }
});
```

这样平移时编辑框会跟随节点移动。方案 B 体验更好但可能有性能问题。

**最终选择方案 B** - 让编辑框跟随节点移动，用户体验更好。
