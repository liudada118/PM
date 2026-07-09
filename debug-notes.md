# 重影 Bug 分析

从截图来看：
- "子模块 A"、"子模块 B"、"子模块 C"、"子模块 D" 这些第三级节点有明显的重影效果
- 重影表现为：节点有双重边框/阴影，像是两个节点叠在一起
- 根节点"假人"和二级节点"软件"、"模块二"没有重影
- 只有第三级（最末级）节点有重影

可能原因：
1. simple-mind-map 的 themeConfig 中 `node` 样式的 borderWidth/shadow 设置导致视觉重影
2. 或者是 applyHighlights 中对节点 group 的操作导致了额外的边框
3. 或者是 CSS box-shadow 或 SVG filter 导致的视觉效果

从截图仔细看，重影更像是**连接线的末端装饰**（箭头/分叉）造成的视觉效果，而非节点本身被渲染两次。
连接线在子节点处有一个"<"形状的分叉，看起来像是重影。

实际上这可能是 simple-mind-map 的连接线样式问题：
- lineStyle: "curve" 配合 rootLineKeepSameInCurve: true
- 连接线末端的装饰样式
