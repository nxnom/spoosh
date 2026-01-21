import { notFound } from "next/navigation";
import { FRAMEWORKS, type Framework } from "@/lib/source";

interface FrameworkLayoutProps {
  children: React.ReactNode;
  params: Promise<{ framework: string }>;
}

export function generateStaticParams() {
  return FRAMEWORKS.map((framework) => ({ framework }));
}

export default async function FrameworkLayout({
  children,
  params,
}: FrameworkLayoutProps) {
  const { framework } = await params;

  if (!FRAMEWORKS.includes(framework as Framework)) {
    notFound();
  }

  return <>{children}</>;
}
