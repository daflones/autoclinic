import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  label: string
  required?: boolean
  min?: string
}

export function DateTimePicker({ value, onChange, label, required, min }: DateTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(value ? new Date(value) : new Date())
  const rootRef = useRef<HTMLDivElement | null>(null)

  const formatLocalDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mi = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const minDate = useMemo(() => {
    if (!min) return null
    const d = new Date(min)
    return Number.isNaN(d.getTime()) ? null : d
  }, [min])

  useEffect(() => {
    if (!showPicker) return
    const next = value ? new Date(value) : new Date()
    if (!Number.isNaN(next.getTime())) setSelectedDate(next)
  }, [showPicker, value])

  useEffect(() => {
    if (!showPicker) return

    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const root = rootRef.current
      if (!root) return
      const target = ev.target as Node | null
      if (target && root.contains(target)) return
      setShowPicker(false)
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [showPicker])

  useEffect(() => {
    if (!showPicker || !rootRef.current) return
    // Calendar now always appears below, no positioning calculation needed
  }, [showPicker])

  const formatDisplayValue = (dateTime: string) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const generateCalendar = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const handleDateSelect = (date: Date) => {
    let newDate = new Date(selectedDate)
    newDate.setFullYear(date.getFullYear())
    newDate.setMonth(date.getMonth())
    newDate.setDate(date.getDate())

    if (minDate && newDate < minDate) {
      newDate = new Date(minDate)
    }
    setSelectedDate(newDate)
    
    // Formatar para YYYY-MM-DDTHH:MM (horário local)
    const formatted = formatLocalDateTime(newDate)
    onChange(formatted)
  }

  const handleTimeChange = (hours: number, minutes: number) => {
    let newDate = new Date(selectedDate)
    newDate.setHours(hours)
    newDate.setMinutes(minutes)

    if (minDate && newDate < minDate) {
      newDate = new Date(minDate)
    }
    setSelectedDate(newDate)
    
    const formatted = formatLocalDateTime(newDate)
    onChange(formatted)
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative" ref={rootRef}>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setShowPicker(!showPicker)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDisplayValue(value) : 'Selecione data e hora'}
        </Button>

        {showPicker && (
          <Card
            className="absolute left-0 top-full mt-2 z-[999] w-[320px] max-w-[92vw]"
          >
            <CardContent className="p-2">
              {/* Header do calendário */}
              <div className="flex items-center justify-between mb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setSelectedDate(newDate)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setSelectedDate(newDate)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-[11px] font-medium p-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendário */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendar().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
                  const isSelected = date.toDateString() === selectedDate.toDateString()
                  const isToday = date.toDateString() === new Date().toDateString()

                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={isSelected ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-6 w-6 p-0 text-[11px] ${!isCurrentMonth ? 'text-gray-400' : ''} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => handleDateSelect(date)}
                    >
                      {date.getDate()}
                    </Button>
                  )
                })}
              </div>

              {/* Seletor de hora */}
              <div className="border-t mt-2 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Hora</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={selectedDate.getHours()}
                    onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, selectedDate.getMinutes())}
                    className="w-16"
                  />
                  <span className="self-center">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={selectedDate.getMinutes()}
                    onChange={(e) => handleTimeChange(selectedDate.getHours(), parseInt(e.target.value) || 0)}
                    className="w-16"
                  />
                </div>

                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Horários comuns:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'].map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-1"
                        onClick={() => {
                          const [hours, minutes] = time.split(':').map(Number)
                          handleTimeChange(hours, minutes)
                        }}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(false)} className="flex-1">
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setSelectedDate(now)
                      onChange(formatLocalDateTime(now))
                    }}
                    className="flex-1"
                  >
                    Agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
