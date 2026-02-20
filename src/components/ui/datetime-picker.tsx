import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

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

  // Detecta o container do portal: dialog se dentro de modal, ou null
  const getPortalContainer = useCallback((): HTMLElement | null => {
    if (!rootRef.current) return null
    return rootRef.current.closest('[role="dialog"]') as HTMLElement | null
  }, [])

  const updateCoords = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const dialog = getPortalContainer()
    const W = 320

    if (dialog) {
      // Dentro de um modal: coordenadas relativas ao dialog
      const dialogRect = dialog.getBoundingClientRect()
      let left = rect.left - dialogRect.left
      if (left + W > dialogRect.width) left = Math.max(0, dialogRect.width - W)
      const top = rect.bottom - dialogRect.top + 4
      setCoords({ top, left })
    } else {
      // Fora de modal: coordenadas absolutas na viewport
      let left = rect.left
      if (left + W > window.innerWidth - 8) left = Math.max(8, window.innerWidth - W - 8)
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= 380 ? rect.bottom + 4 : rect.top - 380
      setCoords({ top, left })
    }
  }, [getPortalContainer])

  useEffect(() => {
    if (!showPicker) return
    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [showPicker, updateCoords])

  useEffect(() => {
    if (!showPicker) return
    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node
      if (rootRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setShowPicker(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
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

  const handleOpen = () => {
    if (showPicker) { setShowPicker(false); return }
    updateCoords()
    setShowPicker(true)
  }

  const calendarPopup = (
    <div ref={popupRef}>
      <Card
        className="shadow-xl w-[320px] bg-background border"
        style={{
          position: getPortalContainer() ? 'absolute' : 'fixed',
          top: coords.top,
          left: coords.left,
          zIndex: 9999,
        }}
      >
        <CardContent className="p-2">
          {/* Header do calendário */}
          <div className="flex items-center justify-between mb-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() - 1)
                setSelectedDate(newDate)
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-medium text-xs">
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() + 1)
                setSelectedDate(newDate)
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-0 mb-0.5">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-medium py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendário */}
          <div className="grid grid-cols-7 gap-0">
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
                  className={`h-6 w-6 p-0 text-[10px] ${!isCurrentMonth ? 'text-gray-400' : ''} ${isToday && !isSelected ? 'ring-1 ring-primary' : ''}`}
                  onClick={() => handleDateSelect(date)}
                >
                  {date.getDate()}
                </Button>
              )
            })}
          </div>

          {/* Seletor de hora */}
          <div className="border-t mt-1.5 pt-1.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">Hora</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={selectedDate.getHours()}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, selectedDate.getMinutes())}
                  className="w-12 h-7 text-xs text-center px-1"
                />
                <span className="text-xs">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={selectedDate.getMinutes()}
                  onChange={(e) => handleTimeChange(selectedDate.getHours(), parseInt(e.target.value) || 0)}
                  className="w-12 h-7 text-xs text-center px-1"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2 ml-auto"
                onClick={() => {
                  const now = new Date()
                  setSelectedDate(now)
                  onChange(formatLocalDateTime(now))
                }}
              >
                Agora
              </Button>
            </div>
            <div className="grid grid-cols-6 gap-1 mt-1.5">
              {['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'].map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-5 px-0.5"
                  onClick={() => {
                    const [hours, minutes] = time.split(':').map(Number)
                    handleTimeChange(hours, minutes)
                  }}
                >
                  {time}
                </Button>
              ))}
            </div>
            <Button type="button" size="sm" onClick={() => setShowPicker(false)} className="w-full mt-1.5 h-7 text-xs">
              Confirmar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-1">
      {label && <Label className="text-sm">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>}
      <div ref={rootRef}>
        <Button
          type="button"
          variant="outline"
          className="h-8 justify-start text-left font-normal text-foreground text-xs px-2 whitespace-nowrap"
          onClick={handleOpen}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          {value ? formatDisplayValue(value) : 'Selecione data e hora'}
        </Button>

        {showPicker && (() => {
          const dialog = getPortalContainer()
          if (dialog) {
            // Dentro de modal: portal no dialog (pointer-events funciona)
            return createPortal(calendarPopup, dialog)
          }
          // Fora de modal: portal no body (sem overlay bloqueando)
          return createPortal(calendarPopup, document.body)
        })()}
      </div>
    </div>
  )
}
