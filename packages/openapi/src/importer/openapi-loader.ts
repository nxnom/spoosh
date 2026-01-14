import fs from "fs";
import { parse as parseYaml } from "yaml";
import type { OpenAPISpec } from "../types.js";

/** Error thrown when OpenAPI spec is invalid */
export class OpenAPILoadError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "OpenAPILoadError";
  }
}

/**
 * Load and parse an OpenAPI specification from a file
 * @param filePath Path to OpenAPI spec file (JSON or YAML)
 * @returns Parsed OpenAPI specification
 */
export function loadOpenAPISpec(filePath: string): OpenAPISpec {
  if (!fs.existsSync(filePath)) {
    throw new OpenAPILoadError(`File not found: ${filePath}`, "FILE_NOT_FOUND");
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const isYaml = filePath.endsWith(".yaml") || filePath.endsWith(".yml");

  let spec: unknown;

  try {
    if (isYaml) {
      spec = parseYaml(content);
    } else {
      spec = JSON.parse(content);
    }
  } catch (error) {
    throw new OpenAPILoadError(
      `Failed to parse ${isYaml ? "YAML" : "JSON"}: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }

  validateOpenAPIVersion(spec);

  return spec as OpenAPISpec;
}

/**
 * Validate that the spec is OpenAPI 3.0.x or 3.1.x
 * @param spec The loaded spec object
 */
function validateOpenAPIVersion(spec: unknown): void {
  if (!spec || typeof spec !== "object") {
    throw new OpenAPILoadError(
      "Invalid OpenAPI spec: not an object",
      "INVALID_SPEC"
    );
  }

  const openapi = (spec as Record<string, unknown>).openapi;

  if (!openapi || typeof openapi !== "string") {
    throw new OpenAPILoadError(
      "Invalid OpenAPI spec: missing or invalid 'openapi' field",
      "MISSING_VERSION"
    );
  }

  if (!openapi.startsWith("3.0.") && !openapi.startsWith("3.1.")) {
    throw new OpenAPILoadError(
      `Unsupported OpenAPI version: ${openapi}. Only 3.0.x and 3.1.x are supported.`,
      "UNSUPPORTED_VERSION",
      { version: openapi }
    );
  }

  if (!(spec as Record<string, unknown>).paths) {
    throw new OpenAPILoadError(
      "Invalid OpenAPI spec: missing 'paths' field",
      "MISSING_PATHS"
    );
  }
}
