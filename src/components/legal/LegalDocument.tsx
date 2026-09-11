import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1
      className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
      {...props}
    />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="mt-10 mb-3 text-2xl font-semibold text-white" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="mt-8 mb-2 text-xl font-semibold text-white" {...props} />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="mb-4 leading-7 text-white/70" {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul
      className="mb-4 list-disc space-y-2 pl-6 text-white/70 marker:text-white/40"
      {...props}
    />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-6 text-white/70 marker:text-white/40"
      {...props}
    />
  ),
  li: ({ node: _node, ...props }) => <li className="leading-7" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: ({ node: _node, ...props }) => (
    <em className="italic text-white/60" {...props} />
  ),
  a: ({ node: _node, href, ...props }) => {
    const isExternal = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="text-[#FFC341] underline underline-offset-2 hover:text-[#ffd166]"
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...props}
      />
    );
  },
  hr: ({ node: _node, ...props }) => (
    <hr className="my-10 border-white/10" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="mb-4 border-l-2 border-white/20 pl-4 text-white/60 italic"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] text-white/90"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="mb-6 w-full overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        {...props}
      />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border-b border-white/20 px-3 py-2 font-semibold text-white"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td
      className="border-b border-white/10 px-3 py-2 align-top text-white/70"
      {...props}
    />
  ),
};

export function LegalDocument({ content }: { content: string }) {
  return (
    <article className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
