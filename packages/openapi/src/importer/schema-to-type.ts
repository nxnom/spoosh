import type { JSONSchema } from "../types.js";
import type { ConversionContext } from "./types.js";

const TS_KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
]);

/**
 * Sanitize type name to avoid TypeScript keyword conflicts
 * @param name Type name
 * @returns Sanitized name
 */
export function sanitizeTypeName(name: string): string {
  if (TS_KEYWORDS.has(name)) {
    return `${name}Type`;
  }
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Check if a property name needs to be quoted
 * @param name Property name
 * @returns Quoted property name if needed, otherwise the original name
 */
export function sanitizePropertyName(name: string): string {
  // Valid JavaScript identifier pattern
  const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

  if (!isValidIdentifier || TS_KEYWORDS.has(name)) {
    return `"${name}"`;
  }

  return name;
}

/**
 * Extract type name from $ref
 * @param ref Reference string (e.g., "#/components/schemas/Post")
 * @returns Type name
 */
export function extractTypeNameFromRef(ref: string): string {
  const parts = ref.split("/");
  const name = parts[parts.length - 1];
  return sanitizeTypeName(name || "Unknown");
}

/**
 * Convert JSON Schema to TypeScript type string
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth (for recursion limit)
 * @returns TypeScript type string
 */
export function schemaToTypeScript(
  schema: JSONSchema | undefined,
  ctx: ConversionContext,
  depth = 0
): string {
  if (!schema || depth > 50) {
    return "unknown";
  }

  if (schema.$ref) {
    const typeName = extractTypeNameFromRef(schema.$ref);
    ctx.refs.add(schema.$ref);
    return typeName;
  }

  let baseType = generateBaseType(schema, ctx, depth);

  if (schema.nullable) {
    baseType = `${baseType} | null`;
  }

  return baseType;
}

/**
 * Generate base TypeScript type from JSON Schema
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth
 * @returns TypeScript type string
 */
function generateBaseType(
  schema: JSONSchema,
  ctx: ConversionContext,
  depth: number
): string {
  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  if (schema.enum) {
    const sortedEnum = [...schema.enum].sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
    return sortedEnum.map((v) => JSON.stringify(v)).join(" | ");
  }

  if (schema.oneOf) {
    return schema.oneOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .join(" | ");
  }

  if (schema.allOf) {
    return schema.allOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .join(" & ");
  }

  if (schema.anyOf) {
    return schema.anyOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .join(" | ");
  }

  // OpenAPI 3.1: Handle type arrays (e.g., ["string", "null"])
  if (Array.isArray(schema.type)) {
    const types = schema.type
      .map((t) => {
        const singleTypeSchema = { ...schema, type: t };
        return generateBaseType(singleTypeSchema, ctx, depth);
      })
      .filter((t) => t !== "null");

    const hasNull = schema.type.includes("null");
    const baseType = types.join(" | ") || "unknown";
    return hasNull ? `${baseType} | null` : baseType;
  }

  switch (schema.type) {
    case "string":
      if (schema.format === "binary") {
        return "File";
      }
      return "string";

    case "number":
    case "integer":
      return "number";

    case "boolean":
      return "boolean";

    case "null":
      return "null";

    case "array":
      if (schema.items) {
        const itemType = schemaToTypeScript(schema.items, ctx, depth + 1);
        return `${itemType}[]`;
      }
      return "unknown[]";

    case "object":
      return generateObjectType(schema, ctx, depth);

    default:
      return "unknown";
  }
}

/**
 * Generate TypeScript object type from JSON Schema
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth
 * @returns TypeScript object type string
 */
function generateObjectType(
  schema: JSONSchema,
  ctx: ConversionContext,
  depth: number
): string {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);

  if (Object.keys(properties).length === 0) {
    return "Record<string, unknown>";
  }

  const hasJsDoc =
    ctx.options.jsdoc && Object.values(properties).some((p) => p.description);

  if (hasJsDoc) {
    const lines: string[] = [];
    for (const [key, propSchema] of Object.entries(properties)) {
      const sanitizedKey = sanitizePropertyName(key);
      const optional = !required.has(key) ? "?" : "";
      const propType = schemaToTypeScript(propSchema, ctx, depth + 1);

      if (propSchema.description) {
        lines.push(`  /** ${propSchema.description} */`);
      }

      lines.push(`  ${sanitizedKey}${optional}: ${propType};`);
    }
    return `{\n${lines.join("\n")}\n}`;
  }

  const props: string[] = [];
  for (const [key, propSchema] of Object.entries(properties)) {
    const sanitizedKey = sanitizePropertyName(key);
    const optional = !required.has(key) ? "?" : "";
    const propType = schemaToTypeScript(propSchema, ctx, depth + 1);
    props.push(`${sanitizedKey}${optional}: ${propType}`);
  }

  return `{ ${props.join("; ")} }`;
}

/**
 * Generate named type definition from JSON Schema
 * @param name Type name
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @returns TypeScript type definition string
 */
export function generateNamedType(
  name: string,
  schema: JSONSchema,
  ctx: ConversionContext
): string {
  const sanitizedName = sanitizeTypeName(name);
  const typeString = schemaToTypeScript(schema, ctx, 0);
  const lines: string[] = [];

  if (ctx.options.jsdoc && schema.description) {
    lines.push(`/** ${schema.description} */`);
  }

  lines.push(`type ${sanitizedName} = ${typeString};`);

  return lines.join("\n");
}
