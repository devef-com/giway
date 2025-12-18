import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, FileUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { compressImage, isAllowedImageType } from '@/lib/image-compression'

// Allowed file types for payout proof
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number]

function isAllowedFileType(mimeType: string): mimeType is AllowedFileType {
  return ALLOWED_FILE_TYPES.includes(mimeType as AllowedFileType)
}

interface PayoutProofFile {
  file: File
  previewUrl?: string
  isImage: boolean
}

interface PayoutProofUploadProps {
  onFileChange?: (file: File | null) => void
  disabled?: boolean
}

export function PayoutProofUpload({
  onFileChange,
  disabled = false,
}: PayoutProofUploadProps) {
  const { t } = useTranslation()
  const [fileData, setFileData] = useState<PayoutProofFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (fileData?.previewUrl) {
        URL.revokeObjectURL(fileData.previewUrl)
      }
    }
  }, [fileData?.previewUrl])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      const file = files[0]

      // Validate file type
      if (!isAllowedFileType(file.type)) {
        toast.error(t('payoutProof.invalidType'))
        return
      }

      // Only apply size limit to PDFs
      if (file.type === 'application/pdf' && file.size > MAX_FILE_SIZE) {
        toast.error(t('payoutProof.pdfTooLarge', { maxMb: 2 }))
        return
      }

      setIsProcessing(true)

      try {
        const isImage = isAllowedImageType(file.type)
        let processedFile = file
        let previewUrl: string | undefined

        if (isImage) {
          // Compress image
          processedFile = await compressImage(file)
          previewUrl = URL.createObjectURL(processedFile)
        }

        const newFileData: PayoutProofFile = {
          file: processedFile,
          previewUrl,
          isImage,
        }

        setFileData(newFileData)
        onFileChange?.(processedFile)
      } catch (error) {
        console.error('Failed to process file:', error)
        toast.error(t('payoutProof.processFailed'))
      } finally {
        setIsProcessing(false)
      }
    },
    [onFileChange],
  )

  const removeFile = useCallback(() => {
    if (fileData?.previewUrl) {
      URL.revokeObjectURL(fileData.previewUrl)
    }
    setFileData(null)
    onFileChange?.(null)
    // Reset input to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [fileData, onFileChange])

  return (
    <div className="space-y-2">
      {fileData ? (
        <Card className="p-3 relative">
          <div className="flex items-center gap-3">
            {fileData.isImage && fileData.previewUrl ? (
              <img
                src={fileData.previewUrl}
                alt={t('payoutProof.previewAlt')}
                className="h-16 w-16 object-cover rounded"
              />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                {fileData.file.name}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {(fileData.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={removeFile}
              disabled={disabled}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${disabled || isProcessing
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-cyan-500 cursor-pointer'
            }`}
          onClick={() =>
            !disabled && !isProcessing && fileInputRef.current?.click()
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_FILE_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isProcessing}
          />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <p className="text-sm text-gray-600">
                {t('payoutProof.processing')}
              </p>
            </div>
          ) : (
            <>
              <FileUp className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {t('payoutProof.clickToUpload')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t('payoutProof.allowedTypes', { maxMb: 2 })}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
