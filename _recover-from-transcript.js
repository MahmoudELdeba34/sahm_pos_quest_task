const fs = require('fs');
const path = require('path');

const transcript =
  'C:\\Users\\LENOVO\\.cursor\\projects\\c-Users-LENOVO-Projects-sahm-smart-pos\\agent-transcripts\\013225fc-cbfa-4293-b18b-b4ee3ff0e6e1\\013225fc-cbfa-4293-b18b-b4ee3ff0e6e1.jsonl';
const outRoot = 'G:\\Smart_Restaurant_Workspace\\_recovered';

const writes = new Map();
const lines = fs.readFileSync(transcript, 'utf8').split(/\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  const content = obj?.message?.content;
  if (!Array.isArray(content)) continue;
  for (const part of content) {
    if (part?.type !== 'tool_use' || part.name !== 'Write') continue;
    const p = part.input?.path;
    const c = part.input?.contents;
    if (typeof p === 'string' && typeof c === 'string') {
      writes.set(p, { i, c });
    }
  }
}

const strReplaces = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  const content = obj?.message?.content;
  if (!Array.isArray(content)) continue;
  for (const part of content) {
    if (part?.type !== 'tool_use' || part.name !== 'StrReplace') continue;
    const p = part.input?.path;
    const oldS = part.input?.old_string;
    const newS = part.input?.new_string;
    if (typeof p === 'string' && typeof oldS === 'string' && typeof newS === 'string') {
      strReplaces.push({ i, p, oldS, newS });
    }
  }
}

function normalize(p) {
  return p.replace(/\//g, '\\');
}

const interesting = [...writes.keys()].filter((p) => {
  const n = normalize(p);
  return (
    n.includes('Smart_Restaurant_Workspace') &&
    (n.includes('\\backend\\') ||
      n.includes('\\frontend\\') ||
      n.includes('\\server\\') ||
      n.includes('\\src\\app\\') ||
      n.endsWith('\\package.json') ||
      n.includes('\\docker-compose.yml') ||
      n.includes('\\README.md') ||
      n.includes('\\.gitignore'))
  );
});

console.log('interesting', interesting.length);
fs.mkdirSync(outRoot, { recursive: true });
const inventory = [];

for (const p of interesting.sort()) {
  let { i, c } = writes.get(p);
  for (const sr of strReplaces) {
    if (sr.i <= i) continue;
    if (sr.p !== p) continue;
    if (c.includes(sr.oldS)) {
      c = c.split(sr.oldS).join(sr.newS);
      i = sr.i;
    }
  }
  let rel = normalize(p).replace(/^G:\\Smart_Restaurant_Workspace\\?/i, '');
  // map root src writes into frontend-ish recovery folder for clarity
  const dest = path.join(outRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, c, 'utf8');
  inventory.push({ line: i, bytes: c.length, path: p, dest: rel });
  console.log(String(i).padStart(5), String(c.length).padStart(6) + 'b', rel);
}

fs.writeFileSync(path.join(outRoot, '_inventory.json'), JSON.stringify(inventory, null, 2));
console.log('Wrote', inventory.length, 'files');

// Also dump unique backend-ish path mentions for missing files
const missingHints = new Set();
for (const line of lines) {
  const m = line.match(/G:\\\\Smart_Restaurant_Workspace\\\\backend\\\\src\\\\[^\"\\]+(?:\\\\[^\"\\]+)*/g);
  if (m) m.forEach((x) => missingHints.add(x.replace(/\\\\/g, '\\')));
}
console.log('--- path mentions ---');
[...missingHints].sort().forEach((p) => console.log(p));
