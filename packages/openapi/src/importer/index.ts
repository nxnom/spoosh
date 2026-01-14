import { loadOpenAPISpec } from "./openapi-loader.js";
import { generateSpooshSchema } from "./type-generator.js";
import type { ImportOptions } from "./types.js";
import type { OpenAPISpec } from "../types.js";

export { loadOpenAPISpec, OpenAPILoadError } from "./openapi-loader.js";
export { generateSpooshSchema } from "./type-generator.js";
export * from "./types.js";

/**
 * Import OpenAPI spec from file and generate Spoosh schema
 * @param filePath Path to OpenAPI spec file
 * @param options Import options
 * @returns Generated TypeScript code
 */
export function importOpenAPISpec(
  filePath: string,
  options?: ImportOptions
): string {
  const spec = loadOpenAPISpec(filePath);
  return generateSpooshSchema(spec, options);
}

/**
 * Generate Spoosh schema from OpenAPI spec object
 * @param spec OpenAPI specification
 * @param options Import options
 * @returns Generated TypeScript code
 */
export function generateFromSpec(
  spec: OpenAPISpec,
  options?: ImportOptions
): string {
  return generateSpooshSchema(spec, options);
}
