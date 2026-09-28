declare module "markdown-it-texmath" {
  import type MarkdownItAPI from "markdown-it";

  interface TexmathOptions {
    engine?: unknown;
    delimiters?: string | string[];
    katexOptions?: Record<string, unknown>;
  }

  function texmath(md: MarkdownItAPI.MarkdownIt, options?: TexmathOptions): void;
  export default texmath;
}
