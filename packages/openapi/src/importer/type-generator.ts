import type { OpenAPISpec, JSONSchema } from "../types.js";
import type {
  ConversionContext,
  ImportOptions,
  FlatEndpointStructure,
  EndpointTypeInfo,
  HttpMethod,
} from "./types.js";
import { convertPathsToFlatStructure } from "./path-converter.js";
import { detectEndpointType } from "./endpoint-detector.js";
import {
  generateNamedType,
  sanitizeTypeName,
  ORIGINAL_NAMES,
  clearNameCaches,
  registerSchemaNames,
} from "./schema-to-type.js";

/**
 * Generate TypeScript Spoosh schema from OpenAPI spec
 * @param spec OpenAPI specification
 * @param options Import options
 * @returns Generated TypeScript code
 */
export function generateSpooshSchema(
  spec: OpenAPISpec,
  options: ImportOptions = {}
): string {
  // Clear all caches at the start of each import
  ORIGINAL_NAMES.clear();
  clearNameCaches();

  // Pre-register all schema names to handle collisions
  if (spec.components?.schemas) {
    registerSchemaNames(Object.keys(spec.components.schemas));
  }

  const ctx: ConversionContext = {
    namedTypes: new Map(),
    refs: new Set(),
    options: {
      typeName: "ApiSchema",
      includeImports: false,
      jsdoc: false,
      ...options,
    },
    spec,
  };

  const endpointInfoMap = new Map<string, EndpointTypeInfo>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ["get", "post", "put", "patch", "delete"] as const;

    for (const method of methods) {
      const operation = pathItem[method];
      if (operation) {
        const key = `${path}:${method}`;
        const endpointInfo = detectEndpointType(operation, ctx);
        endpointInfoMap.set(key, endpointInfo);
      }
    }
  }

  const structure = convertPathsToFlatStructure(spec, endpointInfoMap);

  const sections: string[] = [];

  if (ctx.options.includeImports) {
    sections.push(generateImports());
  }

  if (spec.components?.schemas) {
    sections.push(generateComponentTypes(spec, ctx));
  }

  sections.push(generateSchemaType(structure, ctx));

  return sections.filter((s) => s.length > 0).join("\n\n");
}

/**
 * Generate import statements (no imports needed for flat schema)
 * @returns Empty string
 */
function generateImports(): string {
  return "";
}

/**
 * Extract all $ref dependencies from a schema
 */
function extractRefs(schema: unknown): string[] {
  const refs: string[] = [];

  function walk(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }

    const record = obj as Record<string, unknown>;

    if (typeof record.$ref === "string") {
      const parts = record.$ref.split("/");
      const name = parts[parts.length - 1];
      if (name) refs.push(name);
    }

    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  walk(schema);
  return refs;
}

/**
 * Topologically sort schemas so dependencies come before dependents
 */
function topologicalSortSchemas(
  schemas: Record<string, JSONSchema>
): Array<[string, JSONSchema]> {
  const entries = Object.entries(schemas);
  const nameSet = new Set(entries.map(([name]) => name));

  const deps = new Map<string, Set<string>>();
  for (const [name, schema] of entries) {
    const schemaRefs = extractRefs(schema).filter((ref) => nameSet.has(ref));
    deps.set(name, new Set(schemaRefs));
  }

  const sorted: Array<[string, JSONSchema]> = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string): void {
    if (visited.has(name)) return;

    if (visiting.has(name)) {
      visited.add(name);
      return;
    }

    visiting.add(name);

    for (const dep of deps.get(name) || []) {
      visit(dep);
    }

    visiting.delete(name);
    visited.add(name);

    const schema = schemas[name];
    if (schema !== undefined) {
      sorted.push([name, schema]);
    }
  }

  const sortedNames = [...nameSet].sort();
  for (const name of sortedNames) {
    visit(name);
  }

  return sorted;
}

/**
 * Generate component type definitions
 * @param spec OpenAPI spec
 * @param ctx Conversion context
 * @returns Type definitions string
 */
function generateComponentTypes(
  spec: OpenAPISpec,
  ctx: ConversionContext
): string {
  const types: string[] = [];

  if (!spec.components?.schemas) {
    return "";
  }

  const sortedSchemas = topologicalSortSchemas(spec.components.schemas);

  for (const [name, schema] of sortedSchemas) {
    const typeDefinition = generateNamedType(name, schema, ctx);
    types.push(typeDefinition);
  }

  return types.join("\n\n");
}

/**
 * Generate main schema type
 * @param structure Flat structure
 * @param ctx Conversion context
 * @returns Schema type definition
 */
function generateSchemaType(
  structure: FlatEndpointStructure,
  ctx: ConversionContext
): string {
  const typeName = sanitizeTypeName(ctx.options.typeName || "ApiSchema");
  const schemaBody = generateFlatStructureBody(structure, ctx);

  return `export type ${typeName} = ${schemaBody};`;
}

/**
 * Generate flat structure body
 * @param structure Flat structure
 * @param ctx Conversion context
 * @returns TypeScript object literal string
 */
function generateFlatStructureBody(
  structure: FlatEndpointStructure,
  ctx: ConversionContext
): string {
  const entries: string[] = [];
  const indentStr = "  ";

  const sortedPaths = Object.keys(structure).sort();

  for (const path of sortedPaths) {
    const methods = structure[path];

    if (!methods) continue;

    const methodEntries: string[] = [];

    const methodOrder: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

    for (const method of methodOrder) {
      const endpointInfo = methods[method];

      if (endpointInfo) {
        const endpointStr = generateEndpointType(endpointInfo);

        if (ctx.options.jsdoc && endpointInfo.description) {
          methodEntries.push(`    /** ${endpointInfo.description} */`);
        }

        methodEntries.push(`    ${method}: ${endpointStr};`);
      }
    }

    if (methodEntries.length > 0) {
      const pathKey = JSON.stringify(path);
      entries.push(
        `${indentStr}${pathKey}: {\n${methodEntries.join("\n")}\n${indentStr}};`
      );
    }
  }

  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries.join("\n")}\n}`;
}

/**
 * Generate endpoint type expression
 * @param info Endpoint type info
 * @returns TypeScript type expression
 */
function generateEndpointType(info: EndpointTypeInfo): string {
  if (info.isVoid) {
    return "{ data: void }";
  }

  const fields: string[] = [`data: ${info.dataType}`];

  if (info.bodyType) {
    fields.push(`body: ${info.bodyType}`);
  }

  if (info.queryType) {
    fields.push(`query: ${info.queryType}`);
  }

  if (info.formDataType) {
    fields.push(`formData: ${info.formDataType}`);
  }

  if (info.urlEncodedType) {
    fields.push(`urlEncoded: ${info.urlEncodedType}`);
  }

  if (info.errorType) {
    fields.push(`error: ${info.errorType}`);
  }

  return `{ ${fields.join("; ")} }`;
}
