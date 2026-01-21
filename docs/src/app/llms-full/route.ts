import { getLLMText, reactSource, angularSource } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const reactPages = reactSource.getPages().map(getLLMText);
  const angularPages = angularSource.getPages().map(getLLMText);

  const reactScanned = await Promise.all(reactPages);
  const angularScanned = await Promise.all(angularPages);

  const content = [
    "# React Documentation\n",
    ...reactScanned,
    "\n\n# Angular Documentation\n",
    ...angularScanned,
  ].join("\n\n");

  return new Response(content);
}
