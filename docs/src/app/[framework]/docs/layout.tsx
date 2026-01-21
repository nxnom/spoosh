import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { getSourceByFramework, type Framework } from "@/lib/source";
import { FrameworkSwitcher } from "@/components/framework-switcher";
import type { Folder, Root } from "fumadocs-core/page-tree";

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ framework: string }>;
}

function getTreeWithLLM(tree: Root, framework: Framework): Root {
  const llmFolder: Folder = {
    type: "folder",
    name: "LLM",
    index: undefined,
    children: [
      {
        type: "page",
        name: "Docs List",
        url: `/${framework}/llms`,
        external: true,
      },
      {
        type: "page",
        name: "Full Docs",
        url: `/${framework}/llms-full`,
        external: true,
      },
    ],
  };

  return {
    ...tree,
    children: [...tree.children, llmFolder],
  };
}

export default async function Layout({ children, params }: DocsLayoutProps) {
  const { framework } = await params;
  const source = getSourceByFramework(framework as Framework);
  const options = baseOptions(framework as Framework);
  const tree = getTreeWithLLM(source.getPageTree(), framework as Framework);

  return (
    <DocsLayout
      tree={tree}
      nav={options.nav}
      links={options.links?.filter((link) => link.type === "icon")}
      sidebar={{
        banner: <FrameworkSwitcher framework={framework as Framework} />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
