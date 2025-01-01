/**
 * One-off: replace `import * as React` + `React.foo` with named imports from "react".
 * Run: node scripts/migrate-react-namespace.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(import.meta.dirname, "..", "src");

/** Symbols that are type-only from "react" (use `import { type X }`). */
const TYPE_NAMES = new Set([
  "AnchorHTMLAttributes",
  "AnimationEvent",
  "AriaAttributes",
  "ButtonHTMLAttributes",
  "ChangeEvent",
  "ClipboardEvent",
  "ComponentProps",
  "ComponentPropsWithRef",
  "ComponentPropsWithoutRef",
  "ComponentType",
  "CompositionEvent",
  "CSSProperties",
  "DetailedHTMLProps",
  "DOMAttributes",
  "DragEvent",
  "ElementRef",
  "FocusEvent",
  "FormEvent",
  "HTMLAttributes",
  "InputHTMLAttributes",
  "KeyboardEvent",
  "LiHTMLAttributes",
  "MouseEvent",
  "PointerEvent",
  "PropsWithChildren",
  "ReactElement",
  "ReactEventHandler",
  "ReactNode",
  "Ref",
  "RefObject",
  "SelectHTMLAttributes",
  "SVGAttributes",
  "SVGProps",
  "SyntheticEvent",
  "TdHTMLAttributes",
  "TextareaHTMLAttributes",
  "ThHTMLAttributes",
  "TouchEvent",
  "TransitionEvent",
  "UIEvent",
  "WheelEvent",
  "JSX",
  "ElementType",
  "MutableRefObject",
  "LegacyRef",
  "ClassAttributes",
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name.name)) out.push(p);
  }
  return out;
}

function migrateFile(filePath) {
  let s = fs.readFileSync(filePath, "utf8");
  if (!/import \* as React from ["']react["']/.test(s)) return false;

  const used = new Set();
  const re = /React\.([A-Za-z][a-zA-Z0-9]*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    used.add(m[1]);
  }

  s = s.replace(/import \* as React from ["']react["'];?\r?\n?/, "");
  s = s.replace(/React\.([A-Za-z][a-zA-Z0-9]*)/g, "$1");

  const names = [...used].sort((a, b) => a.localeCompare(b));
  const specifiers = names
    .map((n) => (TYPE_NAMES.has(n) ? `type ${n}` : n))
    .join(", ");
  const importLine = `import { ${specifiers} } from "react";\n`;

  fs.writeFileSync(filePath, importLine + s);
  return true;
}

let n = 0;
for (const f of walk(SRC)) {
  if (migrateFile(f)) {
    console.log(f);
    n++;
  }
}
console.error(`Migrated ${n} files.`);
