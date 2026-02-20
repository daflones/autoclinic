import { useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

export interface PairItem {
  left: string
  right: string
}

interface PairsEditorProps {
  title: string
  leftLabel: string
  rightLabel: string
  addLabel?: string
  items: PairItem[]
  onChange: (items: PairItem[]) => void
  disabled?: boolean
}

export function PairsEditor({
  title,
  leftLabel,
  rightLabel,
  addLabel,
  items,
  onChange,
  disabled,
}: PairsEditorProps) {
  const dragIndexRef = useRef<number | null>(null)

  const normalized = useMemo<PairItem[]>(() => {
    const base = Array.isArray(items) ? items : []
    return base
      .map((it) => ({
        left: typeof it?.left === 'string' ? it.left : '',
        right: typeof it?.right === 'string' ? it.right : '',
      }))
  }, [items])

  const addItem = () => {
    onChange([...(normalized || []), { left: '', right: '' }])
  }

  const updateItem = (idx: number, patch: Partial<PairItem>) => {
    const next = [...normalized]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  const removeItem = (idx: number) => {
    const next = [...normalized]
    next.splice(idx, 1)
    onChange(next)
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...normalized]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <Button type="button" variant="outline" disabled={disabled} onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel || 'Adicionar'}
        </Button>
      </div>

      {normalized.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum item adicionado</div>
      ) : (
        <div className="space-y-3">
          {normalized.map((it, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/60 bg-background p-3"
              draggable={!disabled}
              onDragStart={() => {
                dragIndexRef.current = idx
              }}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={() => {
                const from = dragIndexRef.current
                dragIndexRef.current = null
                if (typeof from === 'number') reorder(from, idx)
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span>Arraste para reordenar</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
<Label className="text-sm">{leftLabel}</Label>
                  <Input
                    value={it.left}
                    disabled={disabled}
                    onChange={(e) => updateItem(idx, { left: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
<Label className="text-sm">{rightLabel}</Label>
                  <Textarea
                    value={it.right}
                    disabled={disabled}
                    rows={3}
                    onChange={(e) => updateItem(idx, { right: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
