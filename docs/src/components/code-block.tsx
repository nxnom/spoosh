import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export async function CodeBlock({ code, lang = 'typescript' }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    theme: 'github-dark',
  });

  return (
    <div
      className="[&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:border [&_pre]:border-fd-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
