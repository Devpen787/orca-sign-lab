import { gzipSync } from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const assetsDirectory = resolve(root, 'dist/assets')
const limits = {
  maxJavaScriptGzipKiB: 340,
  totalJavaScriptGzipKiB: 475,
  maxCssGzipKiB: 15,
}
const errors = []
const rows = []
let totalJavaScriptGzip = 0

for (const file of await readdir(assetsDirectory)) {
  const extension = extname(file)
  if (extension !== '.js' && extension !== '.css') continue
  const contents = await readFile(resolve(assetsDirectory, file))
  const gzipKiB = gzipSync(contents).byteLength / 1024
  rows.push({ file, rawKiB: contents.byteLength / 1024, gzipKiB })
  if (extension === '.js') {
    totalJavaScriptGzip += gzipKiB
    if (gzipKiB > limits.maxJavaScriptGzipKiB) {
      errors.push(
        `${file} is ${gzipKiB.toFixed(1)} KiB gzip (limit ${limits.maxJavaScriptGzipKiB} KiB)`,
      )
    }
  }
  if (extension === '.css' && gzipKiB > limits.maxCssGzipKiB) {
    errors.push(`${file} is ${gzipKiB.toFixed(1)} KiB gzip (limit ${limits.maxCssGzipKiB} KiB)`)
  }
}

if (totalJavaScriptGzip > limits.totalJavaScriptGzipKiB) {
  errors.push(
    `JavaScript total is ${totalJavaScriptGzip.toFixed(1)} KiB gzip (limit ${limits.totalJavaScriptGzipKiB} KiB)`,
  )
}

console.table(
  rows
    .toSorted((left, right) => right.gzipKiB - left.gzipKiB)
    .map(({ file, rawKiB, gzipKiB }) => ({
      file,
      'raw KiB': rawKiB.toFixed(1),
      'gzip KiB': gzipKiB.toFixed(1),
    })),
)

if (errors.length) {
  console.error(`Bundle budget failed (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Bundle budget passed: ${totalJavaScriptGzip.toFixed(1)} KiB total JavaScript gzip`)
