<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/wordmark-dark.svg">
    <img src="docs/assets/brand/wordmark-light.svg" alt="Margin Markdown" width="360">
  </picture>
  <h1>Zotero PDF 页边 Markdown 批注</h1>
  <p>阅读时渲染 Markdown 和数学公式；编辑时保留原始文本。</p>
  <p><a href="README.en.md">English</a> · <a href="#安装与快速开始">安装与快速开始</a> · <a href="docs/manual-smoke-test.md">使用与测试</a> · <a href="https://github.com/s1nyon/Margin-Markdown/issues">反馈问题</a></p>
  <p>
    <a href="https://www.zotero.org/support/" aria-label="Zotero 9–10"><img alt="Zotero 9–10" src="https://img.shields.io/badge/Zotero-9%E2%80%9310-4f46e5?style=flat-square"></a>
    <img alt="Markdown and LaTeX" src="https://img.shields.io/badge/Markdown%20%2B-LaTeX-0f766e?style=flat-square">
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-64748b?style=flat-square"></a>
  </p>
</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/hero-dark.svg">
  <img src="docs/assets/brand/hero-light.svg" alt="界面示意：论文中的高亮段落通过引线连接到页边 Markdown 批注，卡片内展示排版后的数学公式。">
</picture>

<p align="center"><sub>界面示意 · 展示典型阅读方式，非 Zotero 实机截图</sub></p>

## 功能

- 卡片通过引线连接到对应的 PDF 批注，并会自动排布；批注较多时可滚动查看。
- KaTeX 在本地渲染行内和独立公式，离线时也可使用。
- 鼠标停留在长卡片上会展开；文本选中或键盘聚焦时保持展开，也可以固定展开。
- 点击卡片正文可编辑原始 Markdown 文本。

### Markdown 与公式

```markdown
### 为什么可以取最大值？

两个启发式都不会高估到目标的代价，因此可以取：

\[
h(n) = \max(h_1(n), h_2(n))
\]

行内公式也可以写成 $h(n) \leq h^*(n)$。
```

支持标题、粗体、列表、引用、代码、链接，以及 `$...$`、`$$...$$`、`\(...\)` 和 `\[...\]` 数学公式。

## 安装与快速开始

1. 打开 Zotero 9 或 10 的 **工具 → 插件**，在插件管理器的齿轮菜单中选择 **从文件安装插件…**。
2. 选择 Margin Markdown 的 `.xpi` 并按提示重启 Zotero。
3. 打开 PDF，在 Zotero 批注中添加评论；阅读时可直接在页边查看。
4. 鼠标停留在较长的卡片上即可展开；点击卡片正文切换到 Markdown 源码编辑。

可从 [GitHub Release v0.1.5](https://github.com/s1nyon/Margin-Markdown/releases/tag/v0.1.5) 下载 `margin-markdown-0.1.5.xpi`，也可以按下方步骤从源码构建安装包。

Margin Markdown 与 Zotero Margin Comments 使用不同的插件 ID，但两者都在 PDF 页边显示卡片。使用时请只启用其中一个，避免重复显示。

## 偏好设置

在 Margin Markdown 偏好设置中可以调整：

| 设置 | 范围 | 默认值 |
| --- | --- | --- |
| 卡片宽度 | 260–380 px | 300 px |
| 预览字号 | 80–160% | 100% |
| 公式字号 | 80–160% | 100% |

还可以筛选批注类型、切换 Markdown 或 LaTeX 渲染，并选择是否缩小 PDF 中的便签图标。编辑时按 `Cmd/Ctrl + Enter` 保存，按 `Esc` 取消本次未保存的修改。

## 批注存储

Zotero 的 `annotation.comment` 始终保存原始 Markdown 文本。插件生成的 HTML 只用于阅读显示，不会写入批注数据。禁用或移除插件后，评论仍可作为普通文本读取。

## 兼容性

本项目支持 **Zotero 9–10**。0.1.5 已在 Windows 的 Zotero 10.0.5 独立配置中验证启用、PDF 卡片与引线、Markdown 和数学公式、批注保存、定位、缩放旋转、类型过滤、小便签图标及停用后重新启用。自动化测试覆盖核心渲染、布局和保存流程；其他系统与版本仍需按[手动测试清单](docs/manual-smoke-test.md)分别验证。

## 从源码构建

需要 Node.js 22.8 或更高版本，以及 pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm stress
pnpm build
pnpm package
pnpm verify
```

`pnpm package` 会生成 `dist/margin-markdown-<版本>.xpi`。`pnpm verify` 会检查插件 ID、版本、离线 KaTeX 字体、许可证文件和安装包校验值。

代码分层、数据边界和 Reader 适配见[架构说明](docs/architecture.md)；Logo 与配色规则见[品牌规范](docs/branding.md)。需要复现 Zotero 内操作时，参考[手动测试清单（中文）](docs/manual-smoke-test.md)。

## 致谢与许可

Margin Markdown 基于 [XiaoDuComrade 的 Zotero Margin Comments 0.8.6](docs/upstream.md) 继续开发。上游版权和 MIT 许可见 [LICENSE](LICENSE)；依赖许可见[第三方声明](THIRD_PARTY_NOTICES.md)。

由 **s1nyon** 维护，采用 MIT License。问题请提交到 [GitHub Issues](https://github.com/s1nyon/Margin-Markdown/issues)。
