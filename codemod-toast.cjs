const fs = require('fs')
const path = require('path')

const root = __dirname
const src = path.join(root, 'src')

function walk(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build') continue
      out.push(...walk(p))
    } else if (ent.isFile()) {
      if (/\.(ts|tsx)$/.test(ent.name)) out.push(p)
    }
  }
  return out
}

const files = walk(src)
let changed = 0
let touched = 0

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  let after = before

  // Replace only the toast import from sonner
  after = after.replace(/import\s*\{\s*toast\s*\}\s*from\s*['\"]sonner['\"];?/g, "import { toast } from '@/lib/toast'")

  // Some files might import multiple things from sonner (rare)
  after = after.replace(/import\s*\{([^}]*\btoast\b[^}]*)\}\s*from\s*['\"]sonner['\"];?/g, (m, inner) => {
    // If it imports toast plus other named exports, keep it as-is (manual fix later)
    // We only auto-fix simple `{ toast }` cases.
    if (inner.trim() === 'toast') return "import { toast } from '@/lib/toast'"
    return m
  })

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8')
    changed++
  }
  if (before.includes("from 'sonner'") || before.includes('from \"sonner\"')) {
    touched++
  }
}

console.log(`Toast codemod done. files_with_sonner_import=${touched}, files_changed=${changed}`)
