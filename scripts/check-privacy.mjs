import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const textExtensions = new Set([
  '',
  '.css',
  '.html',
  '.json',
  '.md',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])
const rules = [
  { label: 'email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { label: 'macOS home path', pattern: /\/Users\/[A-Za-z0-9._-]+\//g },
  { label: 'Windows home path', pattern: /[A-Z]:\\Users\\[A-Za-z0-9._-]+\\/gi },
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9]{30,}/g },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/g },
]
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => textExtensions.has(extname(file)))
const findings = []

for (const file of files) {
  let contents
  try {
    contents = await readFile(resolve(root, file), 'utf8')
  } catch (reason) {
    if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') continue
    throw reason
  }
  for (const rule of rules) {
    rule.pattern.lastIndex = 0
    if (rule.pattern.test(contents)) findings.push(`${file}: contains ${rule.label}`)
  }
}

if (findings.length) {
  console.error(`Privacy scan failed (${findings.length})`)
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log(
  `Privacy scan passed: ${files.length} text file(s), no configured PII or secret patterns`,
)
