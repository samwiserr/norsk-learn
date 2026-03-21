#!/usr/bin/env node
import fs from "fs";
import path from "path";

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
const inputPath = path.resolve(repoRoot, getArg("input", "review-report.json"));
const outputPath = path.resolve(repoRoot, getArg("output", "review-report.md"));

const raw = fs.readFileSync(inputPath, "utf8");
const report = JSON.parse(raw);

const s = report.summary || {};
const sev = s.severities || { critical: 0, high: 0, medium: 0, low: 0 };
const byType = s.byType || {};
const files = report.files || [];

const topFiles = files
  .map((f) => ({ file: f.file, count: (f.findings || []).length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 12);

const lines = [
  "# Automated Code Review Report",
  "",
  `- Generated: ${report.generatedAt || "unknown"}`,
  `- Base: \`${report.baseRef || "main"}\``,
  `- Head: \`${report.headRef || "HEAD"}\``,
  `- Analyzed files: ${report.analyzedFiles || 0}`,
  "",
  "## Verdict",
  "",
  `- Verdict: **${s.verdict || "unknown"}**`,
  `- Score: **${s.score ?? "n/a"} / 100**`,
  `- Complexity score: **${s.complexityScore ?? "n/a"} / 10**`,
  "",
  "## Severity Counts",
  "",
  `- Critical: ${sev.critical || 0}`,
  `- High: ${sev.high || 0}`,
  `- Medium: ${sev.medium || 0}`,
  `- Low: ${sev.low || 0}`,
  "",
  "## Finding Types",
  "",
];

for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  lines.push(`- \`${type}\`: ${count}`);
}

lines.push("", "## Highest Priority Files", "");
if (topFiles.length === 0) {
  lines.push("- No findings.");
} else {
  for (const f of topFiles) lines.push(`- \`${f.file}\`: ${f.count} finding(s)`);
}

lines.push("", "## Notes", "", "- This report is advisory-only in CI.", "- Tune thresholds and patterns over time before enabling hard gating.");

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote review report markdown: ${outputPath}`);
