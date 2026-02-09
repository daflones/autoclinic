import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white dark:bg-gray-900 rounded-xl", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-between items-center mb-4",
        caption_label: "text-base font-semibold capitalize text-gray-900 dark:text-gray-100",
        nav: "flex items-center gap-1",
        nav_button: "h-8 w-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center text-gray-700 dark:text-gray-300",
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse mt-4",
        head_row: "flex w-full",
        head_cell: "text-gray-500 dark:text-gray-400 w-10 font-semibold text-xs text-center",
        row: "flex w-full mt-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative",
        day: "h-10 w-10 p-0 font-normal rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors inline-flex items-center justify-center text-gray-800 dark:text-gray-200 cursor-pointer",
        day_selected: "bg-purple-600 text-white hover:bg-purple-700 focus:bg-purple-700 font-semibold",
        day_today: "bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200 font-semibold",
        day_outside: "invisible",
        day_disabled: "text-gray-300 dark:text-gray-700 opacity-50 cursor-not-allowed",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
