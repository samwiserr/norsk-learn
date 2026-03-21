#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const pref = `--${name}=`;
  const inline = args.find((a) => a.startsWith(pref));
  if (inline) return inline.slice(pref.length);
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
};

const repoRoot = process.cwd();
const baseRef = getArg("base", process.env.GITHUB_BASE_REF || "main");
const headRef = getArg("head", process.env.GITHUB_HEAD_REF || "HEAD");
const outputPath = path.resolve(repoRoot, getArg("output", "review-report.json"));

const ALLOWED_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".swift", ".kt", ".kts"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "coverage", ".coverage", "dist", "build"]);

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function listFilesRecursive(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listFilesRecursive(p));
      continue;
    }
    if (!ALLOWED_EXT.has(path.extname(e.name))) continue;
    out.push(p);
  }
  return out;
}

function getChangedFiles() {
  try {
    const mergeBase = run(`git merge-base ${baseRef} ${headRef}`);
    const raw = run(`git diff --name-only ${mergeBase} ${headRef}`);
    const files = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((f) => path.resolve(repoRoot, f))
      .filter((p) => fs.existsSync(p) && ALLOWED_EXT.has(path.extname(p)));
    if (files.length > 0) return files;
  } catch {
    // Fall back to scanning repository files when git metadata is unavailable.
  }
  return listFilesRecursive(repoRoot);
}

function severityFromCount(count) {
  if (count >= 25) return "high";
  if (count >= 10) return "medium";
  return "low";
}

function collectSignals(filePath, content) {
  const rel = path.relative(repoRoot, filePath).replaceAll("\\", "/");
  const lines = content.split(/\r?\n/);
  const findings = [];
  let maxNesting = 0;
  let depth = 0;
  let totalFunctions = 0;
  let longFunctions = 0;
  let tooManyParams = 0;
  let complexityHits = 0;

  const reSecret = /(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]+|sk_test_[0-9a-zA-Z]+|AIza[0-9A-Za-z\-_]{35}|-----BEGIN\s+[A-Z ]+PRIVATE KEY-----)/;
  const reDebug = /\b(console\.log|debugger)\b/;
  const reDisable = /eslint-disable/;
  const reAny = /:\s*any\b|<any>/;
  const reTodo = /\b(TODO|FIXME)\b/i;
  const reFn = /\b(function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*\{)/;
  const reComplex = /\b(if|else\s+if|for|while|switch|case|catch)\b/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (reSecret.test(line)) findings.push({ severity: "high", type: "hardcoded-secret-pattern", line: i + 1 });
    if (reDebug.test(line)) findings.push({ severity: "low", type: "debug-statement", line: i + 1 });
    if (reDisable.test(line)) findings.push({ severity: "medium", type: "eslint-disable", line: i + 1 });
    if ((filePath.endsWith(".ts") || filePath.endsWith(".tsx")) && reAny.test(line)) {
      findings.push({ severity: "medium", type: "typescript-any", line: i + 1 });
    }
    if (reTodo.test(line)) findings.push({ severity: "low", type: "todo-fixme", line: i + 1 });

    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") depth = Math.max(0, depth - 1);
      if (depth > maxNesting) maxNesting = depth;
    }
    const c = line.match(reComplex);
    if (c) complexityHits += c.length;
  }

  for (let i = 0; i < lines.length; i++) {
    if (!reFn.test(lines[i] || "")) continue;
    totalFunctions += 1;
    const start = i;
    let seen = 0;
    let j = i;
    let paramsCount = 0;
    const sig = lines[i] || "";
    const pStart = sig.indexOf("(");
    const pEnd = sig.indexOf(")", pStart + 1);
    if (pStart >= 0 && pEnd > pStart) {
      const body = sig.slice(pStart + 1, pEnd).trim();
      paramsCount = body ? body.split(",").length : 0;
    }
    if (paramsCount > 5) tooManyParams += 1;
    for (; j < lines.length; j++) {
      const l = lines[j] || "";
      for (const ch of l) {
        if (ch === "{") seen++;
        if (ch === "}") seen--;
      }
      if (seen <= 0 && j > i) break;
    }
    const fnLen = Math.max(1, j - start + 1);
    if (fnLen > 50) longFunctions += 1;
  }

  if (maxNesting > 4) {
    findings.push({ severity: "medium", type: "deep-nesting", details: `max depth ${maxNesting}` });
  }
  if (lines.length > 500) {
    findings.push({ severity: "medium", type: "large-file", details: `${lines.length} lines` });
  }
  if (complexityHits > 10) {
    findings.push({ severity: "medium", type: "high-complexity-heuristic", details: `${complexityHits} branch keywords` });
  }
  if (longFunctions > 0) {
    findings.push({ severity: severityFromCount(longFunctions), type: "long-function-heuristic", details: `${longFunctions}` });
  }
  if (tooManyParams > 0) {
    findings.push({ severity: "low", type: "too-many-params-heuristic", details: `${tooManyParams}` });
  }

  return { file: rel, lines: lines.length, totalFunctions, findings };
}

function summarize(fileReports) {
  const severities = { critical: 0, high: 0, medium: 0, low: 0 };
  const byType = {};
  for (const r of fileReports) {
    for (const f of r.findings) {
      severities[f.severity] = (severities[f.severity] || 0) + 1;
      byType[f.type] = (byType[f.type] || 0) + 1;
    }
  }
  const weighted = severities.high * 8 + severities.medium * 3 + severities.low;
  const complexityScore = Math.max(1, Math.min(10, Math.ceil(weighted / 8) || 1));
  const verdict =
    severities.critical > 0 || severities.high > 8
      ? "block"
      : severities.high > 2 || severities.medium > 20
        ? "request_changes"
        : "approve_with_suggestions";
  const score = Math.max(0, 100 - (severities.critical * 30 + severities.high * 8 + severities.medium * 2 + severities.low));
  return { severities, byType, complexityScore, verdict, score };
}

const files = getChangedFiles();
const fileReports = files.map((f) => collectSignals(f, safeRead(f)));
const summary = summarize(fileReports);
const report = {
  generatedAt: new Date().toISOString(),
  baseRef,
  headRef,
  analyzedFiles: fileReports.length,
  summary,
  files: fileReports.filter((r) => r.findings.length > 0),
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`Wrote review report JSON: ${outputPath}`);
