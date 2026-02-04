import { useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, X } from 'lucide-react'

interface ListEditorProps {
  label?: string
  placeholder?: string
  addPlaceholder?: string
  items: string[]
  onChange: (items: string[]) => void
  disabled?: boolean
  hideEmptyState?: boolean
}

export function ListEditor({
  label,
  placeholder,
  addPlaceholder,
  items,
  onChange,
  disabled,
  hideEmptyState = true,
}: ListEditorProps) {
  const [draft, setDraft] = useState('')
  const dragIndexRef = useRef<number | null>(null)

  const normalized = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((x) => String(x)).filter(Boolean)
  }, [items])

  const addItem = () => {
    const value = draft.trim()
    if (!value) return
    if (normalized.includes(value)) {
      setDraft('')
      return
    }
    onChange([...normalized, value])
    setDraft('')
  }

  const removeItem = (value: string) => {
    onChange(normalized.filter((x) => x !== value))
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
      {label ? <div className="text-sm font-medium text-foreground">{label}</div> : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={addPlaceholder || placeholder || 'Adicionar item'}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
        />
        <Button type="button" variant="outline" disabled={disabled || !draft.trim()} onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {normalized.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {normalized.map((it, idx) => (
            <Badge
              key={it}
              variant="secondary"
              className="flex items-center gap-2"
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
              <GripVertical className="h-3.5 w-3.5 opacity-70" />
              <span className="max-w-[260px] truncate">{it}</span>
              <button
                type="button"
                className="rounded-sm opacity-80 hover:opacity-100"
                disabled={disabled}
                onClick={() => removeItem(it)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : hideEmptyState ? null : (
        <div className="text-sm text-muted-foreground">{placeholder || 'Nenhum item adicionado'}</div>
      )}
    </div>
  )
}
