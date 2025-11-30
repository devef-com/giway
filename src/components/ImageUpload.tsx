import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageIcon, Trash2, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  compressImage,
  createImagePreview,
  isAllowedImageType,
  revokeImagePreview,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/image-compression'
import { toast } from 'sonner'

interface UploadedImage {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress?: number
  assetId?: number
  publicUrl?: string
}

interface ImageUploadProps {
  drawingId?: string
  onImagesChange?: (images: Array<UploadedImage>) => void
  maxImages?: number
  disabled?: boolean
}

export function ImageUpload({
  drawingId,
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ImageUploadProps) {
  const [images, setImages] = useState<Array<UploadedImage>>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => revokeImagePreview(img.previewUrl))
    }
  }, [])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      await processFiles(Array.from(files))

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [images, maxImages, onImagesChange],
  )

  const processFiles = useCallback(
    async (files: File[]) => {
      const remainingSlots = maxImages - images.length
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxImages} images allowed`)
        return
      }

      const filesToProcess = files.slice(0, remainingSlots)

      // Validate file types
      const validFiles = filesToProcess.filter((file) => {
        if (!isAllowedImageType(file.type)) {
          toast.error(
            `Invalid file type: ${file.name}. Allowed types: JPEG, PNG, WEBP`,
          )
          return false
        }
        return true
      })

      if (validFiles.length === 0) return

      setIsCompressing(true)

      try {
        const newImages: Array<UploadedImage> = []

        for (const file of validFiles) {
          try {
            // Compress the image
            const compressedFile = await compressImage(file)
            const previewUrl = createImagePreview(compressedFile)

            const uploadedImage: UploadedImage = {
              id: nanoid(),
              file: compressedFile,
              previewUrl,
              status: 'pending',
            }

            newImages.push(uploadedImage)
          } catch (error) {
            console.error('Failed to compress image:', error)
            toast.error(`Failed to process image: ${file.name}`)
          }
        }

        if (newImages.length > 0) {
          const updatedImages = [...images, ...newImages]
          setImages(updatedImages)
          onImagesChange?.(updatedImages)
        }
      } finally {
        setIsCompressing(false)
      }
    },
    [images, maxImages, onImagesChange],
  )

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragCounterRef.current++
      if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    },
    [],
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragCounterRef.current--
      if (dragCounterRef.current === 0) {
        setIsDragging(false)
      }
    },
    [],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
    },
    [],
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      if (disabled || isCompressing) return

      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) {
        await processFiles(files)
      }
    },
    [disabled, isCompressing, processFiles],
  )

  const removeImage = useCallback(
    (imageId: string) => {
      setImages((prev) => {
        const imageToRemove = prev.find((img) => img.id === imageId)
        if (imageToRemove) {
          revokeImagePreview(imageToRemove.previewUrl)
        }
        const updatedImages = prev.filter((img) => img.id !== imageId)
        onImagesChange?.(updatedImages)
        return updatedImages
      })
    },
    [onImagesChange],
  )

  const uploadImage = useCallback(
    async (image: UploadedImage): Promise<UploadedImage> => {
      if (!drawingId) {
        throw new Error('Drawing ID is required for upload')
      }

      try {
        // Update status to uploading
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: 'uploading' } : img,
          ),
        )

        // 1. Get presigned upload URL
        const uploadUrlResponse = await fetch(
          `/api/drawings/${drawingId}/upload`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mimeType: image.file.type,
              size: image.file.size,
            }),
          },
        )

        if (!uploadUrlResponse.ok) {
          const error = await uploadUrlResponse.json()
          throw new Error(error.error || 'Failed to get upload URL')
        }

        const { uploadUrl, s3Key, publicUrl } = await uploadUrlResponse.json()

        // 2. Upload file to S3/R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: image.file,
          headers: {
            'Content-Type': image.file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage')
        }

        // 3. Confirm upload and save asset metadata
        const confirmResponse = await fetch(
          `/api/drawings/${drawingId}/assets`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: publicUrl,
              mimeType: image.file.type,
              size: image.file.size,
              s3Key,
            }),
          },
        )

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json()
          throw new Error(error.error || 'Failed to save asset')
        }

        const { asset } = await confirmResponse.json()

        const uploadedImage: UploadedImage = {
          ...image,
          status: 'uploaded',
          assetId: asset.id,
          publicUrl,
        }

        setImages((prev) =>
          prev.map((img) => (img.id === image.id ? uploadedImage : img)),
        )

        return uploadedImage
      } catch (error) {
        console.error('Upload failed:', error)

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: 'error' } : img,
          ),
        )

        throw error
      }
    },
    [drawingId],
  )

  const uploadAllImages = useCallback(async () => {
    const pendingImages = images.filter((img) => img.status === 'pending')

    const results = await Promise.allSettled(
      pendingImages.map((image) => uploadImage(image)),
    )

    const failedCount = results.filter((r) => r.status === 'rejected').length
    if (failedCount > 0) {
      toast.error(`Failed to upload ${failedCount} image(s)`)
    }
  }, [images, uploadImage])

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Images ({images.length}/{maxImages})
        </label>
        {images.length > 0 && drawingId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={uploadAllImages}
            disabled={
              disabled ||
              images.every((img) => img.status !== 'pending') ||
              isCompressing
            }
          >
            Upload All
          </Button>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((image) => (
            <Card
              key={image.id}
              className="relative aspect-square overflow-hidden p-0"
            >
              <img
                src={image.previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              {/* Status overlay */}
              {image.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {image.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
                  <X className="h-6 w-6 text-white" />
                </div>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                disabled={disabled || image.status === 'uploading'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled || isCompressing
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : isDragging
                ? 'border-primary bg-primary/10 cursor-pointer'
                : 'border-gray-300 hover:border-primary cursor-pointer'
          }`}
          onClick={() =>
            !disabled && !isCompressing && fileInputRef.current?.click()
          }
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isCompressing}
          />
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isCompressing ? (
              'Compressing images...'
            ) : (
              <>
                Click or drag images to upload
                <br />
                <span className="text-xs text-gray-500">
                  JPEG, PNG, WEBP (max {maxImages} images)
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

export type { UploadedImage }
