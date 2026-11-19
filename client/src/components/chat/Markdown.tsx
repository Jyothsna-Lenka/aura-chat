import { memo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return '';
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const child = Array.isArray(children) ? children[0] : children;
  const className: string = (child as { props?: { className?: string } })?.props?.className ?? '';
  const lang = /language-([\w-]+)/.exec(className)?.[1] ?? 'text';
  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1 text-xs text-zinc-400">
        <span>{lang}</span>
        <span className="[&_button]:text-zinc-400 [&_button:hover]:bg-zinc-800 [&_button:hover]:text-zinc-100">
          <CopyButton text={textOf(children)} label="Copy code" />
        </span>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">{children}</pre>
    </div>
  );
}

/** Renders AI Markdown (GFM tables/lists, syntax-highlighted code). Memoised to avoid re-parsing. */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      components={{
        pre: CodeBlock,
        a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
        table: ({ ...props }) => (
          <div className="overflow-x-auto">
            <table {...props} />
          </div>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
});
