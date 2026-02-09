import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? (typeof value === 'string' ? new Date(value) : value) : undefined
  )

  React.useEffect(() => {
    if (value) {
      setDate(typeof value === 'string' ? new Date(value) : value)
    }
  }, [value])

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    onChange?.(selectedDate)
  }

  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors",
            !date && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-black dark:text-white" />
          <span className="truncate">
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            handleSelect(d)
            if (d) setOpen(false)
          }}
          initialFocus
        />
        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-lg"
            onClick={() => {
              setDate(undefined)
              onChange?.(undefined)
              setOpen(false)
            }}
          >
            Fechar
          </Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            onClick={() => {
              const today = new Date()
              setDate(today)
              onChange?.(today)
              setOpen(false)
            }}
          >
            Hoje
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
