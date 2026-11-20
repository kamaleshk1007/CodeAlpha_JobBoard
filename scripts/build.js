const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOTS = ['src', 'scripts', 'tests'];

function collectJavascriptFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavascriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function build() {
  const files = ROOTS.flatMap((root) => collectJavascriptFiles(root));
  for (const file of files) {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  console.log(`build ok: compiled ${files.length} JavaScript files`);
}

build();
