import { reactSource, angularSource } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

const reactSearch = createFromSource(reactSource, {
  language: "english",
});

const angularSearch = createFromSource(angularSource, {
  language: "english",
});

export const { staticGET: GET } = reactSearch;
