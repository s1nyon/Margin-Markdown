<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/wordmark-dark.svg">
    <img src="docs/assets/brand/wordmark-light.svg" alt="Margin Markdown" width="360">
  </picture>
  <h1>让思考，留在论文旁。</h1>
  <p>在 Zotero 页边阅读 Markdown 与数学公式，让批注成为清晰、可编辑的研究笔记。</p>
  <p><a href="README.en.md">English</a> · <a href="#安装与快速开始">安装与快速开始</a> · <a href="docs/manual-smoke-test.md">使用与测试</a> · <a href="https://github.com/s1nyon/Margin-Markdown/issues">反馈问题</a></p>
  <p>
    <a href="https://www.zotero.org/support/" aria-label="Zotero 9"><img alt="Zotero 9" src="https://img.shields.io/badge/Zotero-9-4f46e5?style=flat-square"></a>
    <img alt="Markdown and LaTeX" src="https://img.shields.io/badge/Markdown%20%2B-LaTeX-0f766e?style=flat-square">
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-64748b?style=flat-square"></a>
  </p>
</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/hero-dark.svg">
  <img src="docs/assets/brand/hero-light.svg" alt="界面示意：论文中的高亮段落通过引线连接到页边 Markdown 批注，卡片内展示排版后的数学公式。">
</picture>

<p align="center"><sub>界面示意 · 展示典型阅读方式，非 Zotero 实机截图</sub></p>

Margin Markdown 把批注放在论文页边。阅读时可以查看排版后的 Markdown 和公式；编辑时回到原始文本。论文、解释和推导因此留在同一处。

## 你可以这样阅读

- **视线留在论文上**：页边卡片通过引线对应高亮或其他批注，并会自动避让、滚动显示密集笔记。
- **公式直接读**：KaTeX 在本地渲染行内和独立公式，断网时也可使用。
- **长笔记按需展开**：鼠标停留即可展开，选择或聚焦内容时保持打开，也可以固定展开。
- **源码始终可编辑**：阅读态展示排版结果，点击卡片编辑原始 Markdown。

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

1. 打开 Zotero 9 的 **工具 → 插件**，在插件管理器的齿轮菜单中选择 **从文件安装插件…**。
2. 选择 Margin Markdown 的 `.xpi` 并按提示重启 Zotero。
3. 打开 PDF，在 Zotero 批注中添加评论；阅读时可直接在页边查看。
4. 鼠标停留在较长的卡片上即可展开；点击卡片正文切换到 Markdown 源码编辑。

**目前 GitHub 上还没有公开的 XPI Release。** 开发者可按下方构建步骤生成测试安装包；正式发布后会放在 [Releases](https://github.com/s1nyon/Margin-Markdown/releases)。不要从 Git 历史中取用旧版上游安装包。

Margin Markdown 与 Zotero Margin Comments 使用不同的插件 ID，但两者都在 PDF 页边显示卡片。使用时请只启用其中一个，避免重复显示。

## 按你的阅读习惯调整

在 Margin Markdown 偏好设置中可以调整：

| 设置 | 范围 | 默认值 |
| --- | --- | --- |
| 卡片宽度 | 260–380 px | 300 px |
| 预览字号 | 80–160% | 100% |
| 公式字号 | 80–160% | 100% |

还可以筛选批注类型、切换 Markdown 或 LaTeX 渲染，并选择是否缩小 PDF 中的便签图标。编辑时按 `Cmd/Ctrl + Enter` 保存，按 `Esc` 取消本次未保存的修改。

## 数据保持为文本

Zotero 的 `annotation.comment` 始终保存原始 Markdown 文本。插件生成的 HTML 只用于阅读显示，不会写入批注数据。禁用或移除插件后，评论仍可作为普通文本读取。

## 兼容性

当前目标平台是 **Zotero 9**。Zotero 10 尚未适配。自动化测试覆盖核心渲染、布局和保存流程；macOS、Windows 与 Linux 上的安装和实机体验仍需按[手动测试清单](docs/manual-smoke-test.md)分别验证。

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

Margin Markdown 基于 [XiaoDuComrade 的 Zotero Margin Comments 0.8.6](docs/upstream.md) 继续开发。感谢上游作者及 Markdown、KaTeX 和 DOMPurify 等依赖项目的维护者。上游版权与 MIT 许可保留在 [LICENSE](LICENSE) 和[第三方声明](THIRD_PARTY_NOTICES.md)中。

由 **s1nyon** 维护，采用 MIT License。问题与建议请提交至 [GitHub Issues](https://github.com/s1nyon/Margin-Markdown/issues)。
