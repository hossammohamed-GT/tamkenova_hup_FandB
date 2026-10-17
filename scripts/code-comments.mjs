import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  resolve(root, "tamkeenova-hub_anguler/package.json"),
);
const ts = require("typescript");
const postcss = require("postcss");
const { parseTemplate } = await import(
  pathToFileURL(require.resolve("@angular/compiler")).href
);
const write = process.argv.includes("--write");
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root },
)
  .toString()
  .split("\0")
  .filter(Boolean);
const sourceExtensions = new Set([
  ".ts",
  ".js",
  ".cjs",
  ".mjs",
  ".json",
  ".webmanifest",
]);
let comments = 0,
  changed = 0;

function tsRanges(text, path) {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    extname(path) === ".json" ? ts.ScriptKind.JSON : undefined,
  );
  const ranges = new Map();
  function add(items) {
    for (const item of items ?? [])
      ranges.set(item.pos, { start: item.pos, end: item.end });
  }
  function visit(node) {
    add(ts.getLeadingCommentRanges(text, node.pos));
    add(ts.getTrailingCommentRanges(text, node.end));
    for (const child of node.getChildren(source)) visit(child);
  }
  visit(source);
  return { source, ranges: [...ranges.values()] };
}

function literalAwareRanges(text, prisma = false) {
  const ranges = [];
  for (let i = 0; i < text.length;) {
    const quote = text[i];
    if (quote === "'" || quote === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === quote) {
          if (text[i + 1] === quote) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const dollar = !prisma && text.slice(i).match(/^\$[a-z0-9_]*\$/i)?.[0];
    if (dollar) {
      const end = text.indexOf(dollar, i + dollar.length);
      i = end < 0 ? text.length : end + dollar.length;
      continue;
    }
    if (text.slice(i, i + 2) === (prisma ? "//" : "--")) {
      const start = i;
      while (i < text.length && text[i] !== "\n" && text[i] !== "\r") i++;
      ranges.push({ start, end: i });
      continue;
    }
    if (text.slice(i, i + 2) === "/*") {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < text.length && depth) {
        if (text.slice(i, i + 2) === "/*") {
          depth++;
          i += 2;
        } else if (text.slice(i, i + 2) === "*/") {
          depth--;
          i += 2;
        } else i++;
      }
      ranges.push({ start, end: i });
      continue;
    }
    i++;
  }
  return ranges;
}

assert.equal(
  tsRanges(
    'const url = "https://example.test"; /* actual */ const re = /[/]/;',
    "fixture.ts",
  ).ranges.length,
  1,
);
assert.equal(
  literalAwareRanges(
    "SELECT '-- literal', $$/* literal */$$; -- actual\n/* actual */",
  ).length,
  2,
);
assert.equal(
  literalAwareRanges('url = "https://example.test" // actual', true).length,
  1,
);
assert.equal(
  parseTemplate(
    '<p title="<!--literal-->">A</p><!--actual-->',
    "fixture.html",
    { collectCommentNodes: true },
  ).commentNodes.length,
  1,
);
let cssComments = 0;
postcss
  .parse('p { content: "/* literal */"; } /* actual */')
  .walkComments(() => cssComments++);
assert.equal(cssComments, 1);

for (const path of [...new Set(files)]) {
  const extension = extname(path);
  const lineConfig = /(?:^|\/)(?:\.gitignore|\.editorconfig)$/.test(path);
  if (
    !lineConfig &&
    !sourceExtensions.has(extension) &&
    ![".css", ".html", ".svg", ".xml", ".sql", ".prisma"].includes(extension)
  )
    continue;
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) continue;
  const text = readFileSync(absolute, "utf8");
  let ranges = [],
    originalSource;
  if (lineConfig) {
    for (const match of text.matchAll(/^[ \t]*#.*$/gm))
      ranges.push({ start: match.index, end: match.index + match[0].length });
  } else if (sourceExtensions.has(extension)) {
    const parsed = tsRanges(text, path);
    ranges = parsed.ranges;
    originalSource = parsed.source;
  } else if (extension === ".css") {
    postcss.parse(text, { from: path }).walkComments((comment) => {
      const start = comment.source.start.offset;
      ranges.push({ start, end: text.indexOf("*/", start) + 2 });
    });
  } else if (extension === ".sql" || extension === ".prisma") {
    ranges = literalAwareRanges(text, extension === ".prisma");
  } else if (extension === ".html") {
    const parsed = parseTemplate(text, path, { collectCommentNodes: true });
    ranges = (parsed.commentNodes ?? []).map((node) => ({
      start: node.sourceSpan.start.offset,
      end: node.sourceSpan.end.offset,
    }));
  } else {
    for (const match of text.matchAll(/<!--[\s\S]*?-->/g))
      ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  ranges = ranges.filter(
    (item, index) =>
      !ranges
        .slice(0, index)
        .some((parent) => parent.start <= item.start && parent.end >= item.end),
  );
  if (!ranges.length) continue;
  comments += ranges.length;
  changed++;
  let updated = text;
  for (const range of ranges.toReversed()) {
    const removed = text.slice(range.start, range.end);
    updated =
      updated.slice(0, range.start) +
      " " +
      removed.replace(/[^\r\n]/g, "") +
      updated.slice(range.end);
  }
  updated = updated.replace(/[ \t]+$/gm, "");
  if (originalSource && ![".json", ".webmanifest"].includes(extension)) {
    const printer = ts.createPrinter({ removeComments: true });
    const result = ts.createSourceFile(
      path,
      updated,
      ts.ScriptTarget.Latest,
      true,
    );
    if (printer.printFile(originalSource) !== printer.printFile(result))
      throw new Error(`Comment removal changed executable syntax: ${path}`);
  }
  if (write) writeFileSync(absolute, updated);
}
console.log(
  JSON.stringify({
    mode: write ? "remove" : "check",
    files: changed,
    comments,
  }),
);
if (!write && comments) process.exitCode = 1;
