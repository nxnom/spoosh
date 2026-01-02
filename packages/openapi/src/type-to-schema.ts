import ts from "typescript";
import type { JSONSchema } from "./types.js";

const MAX_DEPTH = 50;

export type SchemaContext = {
  checker: ts.TypeChecker;
  schemas: Map<string, JSONSchema>;
  visitedTypes: Set<string>;
  depth: number;
};

export function createSchemaContext(checker: ts.TypeChecker): SchemaContext {
  return {
    checker,
    schemas: new Map(),
    visitedTypes: new Set(),
    depth: 0,
  };
}

export function typeToSchema(
  type: ts.Type,
  ctx: SchemaContext
): JSONSchema {
  if (ctx.depth > MAX_DEPTH) {
    return {};
  }

  const { checker } = ctx;

  if (type.flags & ts.TypeFlags.String) {
    return { type: "string" };
  }

  if (type.flags & ts.TypeFlags.Number) {
    return { type: "number" };
  }

  if (type.flags & ts.TypeFlags.Boolean) {
    return { type: "boolean" };
  }

  if (type.flags & ts.TypeFlags.Null) {
    return { type: "null" };
  }

  if (type.flags & ts.TypeFlags.Undefined || type.flags & ts.TypeFlags.Void) {
    return {};
  }

  if (type.flags & ts.TypeFlags.Any || type.flags & ts.TypeFlags.Unknown) {
    return {};
  }

  if (type.flags & ts.TypeFlags.Never) {
    return {};
  }

  if (type.isStringLiteral()) {
    return { type: "string", const: type.value };
  }

  if (type.isNumberLiteral()) {
    return { type: "number", const: type.value };
  }

  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    const intrinsicName = (type as unknown as { intrinsicName: string }).intrinsicName;
    return { type: "boolean", const: intrinsicName === "true" };
  }

  if (type.isUnion()) {
    const nonNullTypes = type.types.filter(
      (t) => !(t.flags & ts.TypeFlags.Null) && !(t.flags & ts.TypeFlags.Undefined)
    );
    const hasNull = type.types.some((t) => t.flags & ts.TypeFlags.Null);

    if (nonNullTypes.length === 1 && hasNull) {
      const schema = typeToSchema(nonNullTypes[0]!, { ...ctx, depth: ctx.depth + 1 });
      return { ...schema, nullable: true };
    }

    if (nonNullTypes.every((t) => t.isStringLiteral())) {
      return {
        type: "string",
        enum: nonNullTypes.map((t) => (t as ts.StringLiteralType).value),
      };
    }

    if (nonNullTypes.every((t) => t.isNumberLiteral())) {
      return {
        type: "number",
        enum: nonNullTypes.map((t) => (t as ts.NumberLiteralType).value),
      };
    }

    const nextCtx = { ...ctx, depth: ctx.depth + 1 };
    return {
      oneOf: nonNullTypes.map((t) => typeToSchema(t, nextCtx)),
    };
  }

  if (type.isIntersection()) {
    return intersectionTypeToSchema(type, { ...ctx, depth: ctx.depth + 1 });
  }

  if (checker.isArrayType(type)) {
    const typeArgs = (type as ts.TypeReference).typeArguments;
    if (typeArgs?.[0]) {
      return {
        type: "array",
        items: typeToSchema(typeArgs[0], { ...ctx, depth: ctx.depth + 1 }),
      };
    }
    return { type: "array" };
  }

  if (type.flags & ts.TypeFlags.Object) {
    const symbol = type.getSymbol() ?? type.aliasSymbol;
    const typeName = symbol?.getName();

    if (typeName === "Date") {
      return { type: "string", format: "date-time" };
    }

    if (
      typeName &&
      typeName !== "__type" &&
      typeName !== "Array" &&
      !typeName.startsWith("__")
    ) {
      if (ctx.visitedTypes.has(typeName)) {
        return { $ref: `#/components/schemas/${typeName}` };
      }

      if (!ctx.schemas.has(typeName)) {
        ctx.visitedTypes.add(typeName);
        const schema = objectTypeToSchema(type, { ...ctx, depth: ctx.depth + 1 });
        ctx.schemas.set(typeName, schema);
        ctx.visitedTypes.delete(typeName);
      }

      return { $ref: `#/components/schemas/${typeName}` };
    }

    return objectTypeToSchema(type, { ...ctx, depth: ctx.depth + 1 });
  }

  return {};
}

function objectTypeToSchema(type: ts.Type, ctx: SchemaContext): JSONSchema {
  const { checker } = ctx;
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  const props = type.getProperties();

  for (const prop of props) {
    const propName = prop.getName();
    const propType = checker.getTypeOfSymbol(prop);
    const isOptional = prop.flags & ts.SymbolFlags.Optional;

    properties[propName] = typeToSchema(propType, { ...ctx, depth: ctx.depth + 1 });

    if (!isOptional) {
      required.push(propName);
    }
  }

  const schema: JSONSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function intersectionTypeToSchema(
  type: ts.IntersectionType,
  ctx: SchemaContext
): JSONSchema {
  const { checker } = ctx;
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const t of type.types) {
    const props = t.getProperties();

    for (const prop of props) {
      const propName = prop.getName();
      if (propName.startsWith("__")) continue;

      const propType = checker.getTypeOfSymbol(prop);
      const isOptional = prop.flags & ts.SymbolFlags.Optional;

      properties[propName] = typeToSchema(propType, { ...ctx, depth: ctx.depth + 1 });

      if (!isOptional && !required.includes(propName)) {
        required.push(propName);
      }
    }
  }

  const schema: JSONSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}
