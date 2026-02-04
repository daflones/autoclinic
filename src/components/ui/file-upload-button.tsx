import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface FileUploadButtonProps {
  label: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}

export function FileUploadButton({
  label,
  accept,
  multiple,
  disabled,
  onFiles,
}: FileUploadButtonProps) {
  return (
    <div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          onFiles(files)
          e.currentTarget.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        disabled={disabled}
        onClick={(e) => {
          const input = e.currentTarget.previousSibling as HTMLInputElement | null
          input?.click()
        }}
      >
        <Upload className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  )
}
