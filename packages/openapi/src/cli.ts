#!/usr/bin/env node

import { program } from "commander";
import fs from "fs";
import { parseSchema, generateOpenAPISpec } from "./exporter/index.js";
import { importOpenAPISpec } from "./importer/index.js";

program
  .name("spoosh-openapi")
  .description("Convert between Spoosh schemas and OpenAPI specs")
  .version("0.1.0");

program
  .command("export")
  .description("Generate OpenAPI spec from Spoosh TypeScript schema")
  .requiredOption(
    "-s, --schema <path>",
    "Path to TypeScript file containing the schema type"
  )
  .option("-t, --type <name>", "Name of the schema type to use", "ApiSchema")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .option("--title <title>", "API title for OpenAPI info")
  .option("--version <version>", "API version for OpenAPI info", "1.0.0")
  .option("--base-url <url>", "Base URL for servers array")
  .option(
    "--openapi-version <version>",
    "OpenAPI spec version (3.0.0 or 3.1.0)",
    "3.1.0"
  )
  .action((options) => {
    try {
      const openapiVersion =
        options.openapiVersion === "3.0.0" ? "3.0.0" : "3.1.0";

      const { endpoints, schemas } = parseSchema(
        options.schema,
        options.type,
        openapiVersion
      );

      const spec = generateOpenAPISpec(endpoints, schemas, {
        title: options.title,
        version: options.version,
        baseUrl: options.baseUrl,
        openapiVersion,
      });

      const output = JSON.stringify(spec, null, 2);

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`OpenAPI spec written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("import")
  .description("Generate Spoosh TypeScript schema from OpenAPI spec")
  .argument("<input>", "Path to OpenAPI spec file (JSON or YAML)")
  .requiredOption("-o, --output <path>", "Output TypeScript file path")
  .option("-t, --type-name <name>", "Schema type name", "ApiSchema")
  .option("--include-imports", "Include Spoosh type imports")
  .option("--jsdoc", "Include JSDoc comments from descriptions")
  .action((input, options) => {
    try {
      const tsCode = importOpenAPISpec(input, {
        typeName: options.typeName,
        includeImports: options.includeImports,
        jsdoc: options.jsdoc,
      });

      fs.writeFileSync(options.output, tsCode);
      console.log(`Spoosh schema written to ${options.output}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
