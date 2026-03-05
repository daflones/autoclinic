const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'src', 'pages', 'admin', 'AdminPage.tsx')
let lines = fs.readFileSync(file, 'utf8').split('\n')

// Find line with JSON.stringify(p) in planos_tratamento section
let targetLine = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('p.nome || p.procedimento_nome || JSON.stringify(p)')) {
    targetLine = i  // 0-indexed
    console.log(`Found at line ${i+1}: ${lines[i].trim()}`)
    break
  }
}

if (targetLine === -1) {
  console.log('No JSON.stringify(p) found - already fixed')
  process.exit(0)
}

// The block to replace is lines targetLine-2 through targetLine+6 (the full item div)
// targetLine-2: <div key={i} className="flex items-center gap-3 ...">
// targetLine-1: <span ...>{i+1}</span>
// targetLine-0: <div className="min-w-0 flex-1">
//              wait - let's be precise by reading them
console.log('Lines around target:')
for (let i = targetLine - 3; i <= targetLine + 5; i++) {
  console.log(`  ${i+1}: ${lines[i]}`)
}

// Find the opening <div key={i}> for this block
let blockStart = targetLine
while (blockStart > 0 && !lines[blockStart].includes('key={i}')) {
  blockStart--
}
// Find the closing </div> for this block  
let blockEnd = targetLine
let depth = 0
for (let i = blockStart; i < lines.length; i++) {
  const l = lines[i]
  const opens = (l.match(/<div/g) || []).length + (l.match(/<span/g) || []).length + (l.match(/<p /g) || []).length
  const closes = (l.match(/<\/div>/g) || []).length + (l.match(/<\/span>/g) || []).length + (l.match(/<\/p>/g) || []).length
  depth += opens - closes
  if (i > blockStart && depth <= 0) {
    blockEnd = i
    break
  }
}

console.log(`\nBlock: lines ${blockStart+1} to ${blockEnd+1}`)
console.log('Content:')
for (let i = blockStart; i <= blockEnd; i++) {
  console.log(`  ${lines[i]}`)
}

// Build replacement lines
const ind = '                                '  // 32 spaces (same indentation as the div key={i})
const replacement = [
  `${ind}<div key={i} className="rounded-lg border border-neutral-100 bg-white px-3 py-2">`,
  `${ind}  <div className="flex items-center gap-2 mb-1">`,
  `${ind}    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">{i+1}</span>`,
  `${ind}    <p className="text-sm font-semibold text-neutral-900 truncate flex-1">`,
  `${ind}      {typeof p === 'string' ? p : (p.nome || p.procedimento_nome || \`Procedimento \${i+1}\`)}`,
  `${ind}    </p>`,
  `${ind}    {p.valor && <span className="text-xs font-semibold text-neutral-600 shrink-0">{brl(p.valor)}</span>}`,
  `${ind}  </div>`,
  `${ind}  {p.sessoes_realizadas !== undefined && (`,
  `${ind}    <p className="text-xs text-neutral-400 mb-1">{p.sessoes_realizadas}/{p.sessoes_totais || '?'} sessões</p>`,
  `${ind}  )}`,
  `${ind}  {typeof p === 'object' && p !== null && (() => {`,
  `${ind}    const sub = Object.entries(p).filter(([k,v]) => !['nome','procedimento_nome','valor','sessoes_realizadas','sessoes_totais'].includes(k) && v !== null && v !== undefined && v !== '')`,
  `${ind}    return sub.length > 0 ? <JsonbView value={Object.fromEntries(sub)} /> : null`,
  `${ind}  })()}`,
  `${ind}</div>`,
]

lines.splice(blockStart, blockEnd - blockStart + 1, ...replacement)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log(`\n✅ Replaced lines ${blockStart+1}-${blockEnd+1} with ${replacement.length} lines`)

