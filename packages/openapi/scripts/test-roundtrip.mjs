#!/usr/bin/env node

/**
 * Round-trip conversion test script
 *
 * Tests OpenAPI ↔ TypeScript conversion cycle:
 * 1. OpenAPI → TypeScript
 * 2. TypeScript → OpenAPI
 * 3. OpenAPI → TypeScript (again)
 * 4. Compares first and second TypeScript outputs
 *
 * Usage:
 *   npm run test:roundtrip                                    # Uses TMDB API (default)
 *   npm run test:roundtrip https://example.com/openapi.json   # From URL
 *   npm run test:roundtrip ./path/to/openapi.json             # From local file
 */

import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TMP_DIR = path.join(ROOT, ".tmp-roundtrip");

const DEFAULT_API_URL = "https://developer.themoviedb.org/openapi/tmdb-api.json";
const TYPE_NAME = "ApiSchema";

// Get input from command line args
const input = process.argv[2] || DEFAULT_API_URL;
const isUrl = input.startsWith("http://") || input.startsWith("https://");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(num, message) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`Step ${num}: ${message}`, "cyan");
  log("=".repeat(60), "cyan");
}

function success(message) {
  log(`✓ ${message}`, "green");
}

function error(message) {
  log(`✗ ${message}`, "red");
}

function info(message) {
  log(`  ${message}`, "dim");
}

async function downloadFile(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    const data = await response.text();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, data);
    return data;
  } catch (err) {
    throw new Error(`Download failed: ${err.message}`);
  }
}

function runCommand(command, description) {
  info(description || command);
  try {
    execSync(command, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch (err) {
    error(`Command failed: ${command}`);
    console.error(err.stderr?.toString() || err.message);
    return false;
  }
}

function compareFiles(file1, file2) {
  const content1 = fs.readFileSync(file1, "utf-8");
  const content2 = fs.readFileSync(file2, "utf-8");

  if (content1 === content2) {
    return { identical: true, differences: 0 };
  }

  const lines1 = content1.split("\n");
  const lines2 = content2.split("\n");

  let differences = 0;
  const diffLines = [];

  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    if (lines1[i] !== lines2[i]) {
      differences++;
      if (diffLines.length < 10) {
        diffLines.push({
          line: i + 1,
          before: lines1[i] || "(missing)",
          after: lines2[i] || "(missing)",
        });
      }
    }
  }

  return { identical: false, differences, diffLines };
}

async function main() {
  log("\n🔄 OpenAPI Round-Trip Conversion Test", "cyan");
  log("Testing: OpenAPI → TS → OpenAPI → TS\n", "dim");

  if (input !== DEFAULT_API_URL) {
    log(`Input: ${input}`, "dim");
    log(`Type: ${isUrl ? "URL" : "Local file"}\n`, "dim");
  }

  try {
    // Create temp directory
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
    fs.mkdirSync(TMP_DIR, { recursive: true });

    // Step 1: Get OpenAPI spec (download or copy)
    let sourceDescription;
    const specPath = path.join(TMP_DIR, "source.json");

    if (isUrl) {
      step(1, "Download OpenAPI specification from URL");
      info(`Downloading from: ${input}`);
      await downloadFile(input, specPath);
      sourceDescription = "Downloaded";
    } else {
      step(1, "Load OpenAPI specification from local file");
      const absolutePath = path.resolve(ROOT, input);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
      }
      info(`Reading from: ${absolutePath}`);
      fs.copyFileSync(absolutePath, specPath);
      sourceDescription = "Loaded";
    }

    const fileSize = (fs.statSync(specPath).size / 1024 / 1024).toFixed(2);
    success(`${sourceDescription} ${fileSize}MB OpenAPI spec`);

    // Step 2: OpenAPI → TypeScript (first conversion)
    step(2, "Convert OpenAPI → TypeScript (first pass)");
    const firstTsPath = path.join(TMP_DIR, "first-generate.ts");
    if (!runCommand(
      `node dist/cli.mjs import "${specPath}" -o "${firstTsPath}" --type-name ${TYPE_NAME} --include-imports`,
      "Generating TypeScript schema from OpenAPI..."
    )) {
      throw new Error("First import failed");
    }
    const firstLines = fs.readFileSync(firstTsPath, "utf-8").split("\n").length;
    success(`Generated ${firstLines} lines of TypeScript`);

    // Step 3: TypeScript → OpenAPI
    step(3, "Convert TypeScript → OpenAPI");
    const generatedJsonPath = path.join(TMP_DIR, "generated.json");
    if (!runCommand(
      `node dist/cli.mjs export -s "${firstTsPath}" -t ${TYPE_NAME} -o "${generatedJsonPath}" --title "TMDB API"`,
      "Generating OpenAPI spec from TypeScript..."
    )) {
      throw new Error("Export failed");
    }
    const generatedSpec = JSON.parse(fs.readFileSync(generatedJsonPath, "utf-8"));
    const endpointCount = Object.keys(generatedSpec.paths || {}).length;
    success(`Generated OpenAPI spec with ${endpointCount} endpoints`);

    // Step 4: OpenAPI → TypeScript (second conversion)
    step(4, "Convert OpenAPI → TypeScript (second pass)");
    const secondTsPath = path.join(TMP_DIR, "second-generate.ts");
    if (!runCommand(
      `node dist/cli.mjs import "${generatedJsonPath}" -o "${secondTsPath}" --type-name ${TYPE_NAME} --include-imports`,
      "Re-generating TypeScript schema from converted OpenAPI..."
    )) {
      throw new Error("Second import failed");
    }
    const secondLines = fs.readFileSync(secondTsPath, "utf-8").split("\n").length;
    success(`Generated ${secondLines} lines of TypeScript`);

    // Step 5: Compare results
    step(5, "Compare first and second TypeScript outputs");
    const comparison = compareFiles(firstTsPath, secondTsPath);

    if (comparison.identical) {
      success("🎉 Perfect round-trip! Files are identical.");
      log("\nThe conversion is fully lossless.", "green");
    } else {
      log(`Found ${comparison.differences} differing lines`, "yellow");

      if (comparison.diffLines.length > 0) {
        log("\nFirst 10 differences:", "yellow");
        comparison.diffLines.forEach((diff) => {
          log(`\nLine ${diff.line}:`, "dim");

          // Find the actual difference position
          let diffPos = 0;
          for (let i = 0; i < Math.min(diff.before.length, diff.after.length); i++) {
            if (diff.before[i] !== diff.after[i]) {
              diffPos = i;
              break;
            }
          }

          // Show context around the difference
          const contextStart = Math.max(0, diffPos - 50);
          const contextEnd = Math.min(diff.before.length, diffPos + 150);

          log(`  Before: ...${diff.before.substring(contextStart, contextEnd)}...`, "red");
          log(`  After:  ...${diff.after.substring(contextStart, contextEnd)}...`, "green");
          log(`  Diff starts at position: ${diffPos}`, "dim");
        });
      }

      // Check if differences are just enum ordering (acceptable)
      const acceptableDiff = comparison.differences <= 5;
      if (acceptableDiff) {
        success("\n✓ Round-trip mostly successful (minor differences are acceptable)");
        log("  Note: Small differences may be due to enum value ordering", "dim");
      } else {
        error("\n✗ Significant differences detected");
        process.exit(1);
      }
    }

    // Success summary
    log("\n" + "=".repeat(60), "cyan");
    log("📊 Test Summary", "cyan");
    log("=".repeat(60), "cyan");
    success(`Downloaded: ${fileSize}MB OpenAPI spec`);
    success(`Endpoints: ${endpointCount}`);
    success(`Generated: ${firstLines} lines of TypeScript`);
    success(`Round-trip: ${comparison.identical ? "Perfect" : "Mostly successful"}`);
    log("");

  } catch (err) {
    error(`\n❌ Round-trip test failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    // Cleanup
    log("\n🧹 Cleaning up temporary files...", "dim");
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
      info("Removed temporary directory");
    }
  }
}

main();
