/**
 * Minimal eslint-plugin-import resolver for the `@/*` -> `src/*` alias, so that
 * `import/no-restricted-paths` can see through alias imports. Everything else
 * is left to the default node resolver.
 */
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function resolveFile(base) {
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, 'index' + ext)),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

exports.interfaceVersion = 2;

exports.resolve = (source) => {
  if (!source.startsWith('@/')) return { found: false };
  const file = resolveFile(path.join(SRC, source.slice(2)));
  return file ? { found: true, path: file } : { found: false };
};
