import { useCallback, useEffect, useRef, useState } from 'react'
import { Crop, ImageIcon, Trash2, X } from 'lucide-react'
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
import { ImageCropDialog, type CropMode } from './ImageCropDialog'

interface UploadedImage {
  id: string
  /** Original file (kept for re-editing) */
  originalFile: File
  /** Original preview URL (kept for re-editing) */
  originalPreviewUrl: string
  /** File to upload (edited or original) */
  file: File
  /** Preview URL for display */
  previewUrl: string
  /** Whether image has been edited */
  isEdited: boolean
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress?: number
  assetId?: number
  publicUrl?: string
  /** Is this the cover image for OG meta? */
  isCover?: boolean
  /** Cover file (1200x630) for OG meta */
  coverFile?: File
  /** Cover preview URL */
  coverPreviewUrl?: string
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
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [selectedImageForCrop, setSelectedImageForCrop] =
    useState<UploadedImage | null>(null)
  const [cropDialogInitialMode, setCropDialogInitialMode] =
    useState<CropMode>('free')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        revokeImagePreview(img.previewUrl)
        revokeImagePreview(img.originalPreviewUrl)
        if (img.coverPreviewUrl) {
          revokeImagePreview(img.coverPreviewUrl)
        }
      })
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
              originalFile: compressedFile,
              originalPreviewUrl: previewUrl,
              file: compressedFile,
              previewUrl,
              isEdited: false,
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

          // Check if we need to set a cover
          const hasCover = updatedImages.some(
            (img) => img.isCover && img.coverFile,
          )

          if (!hasCover) {
            // No cover set yet - open crop dialog for the first new image in cover mode
            const firstNewImage = newImages[0]
            setSelectedImageForCrop(firstNewImage)
            setCropDialogInitialMode('cover')
            setCropDialogOpen(true)
          }
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
          // Only revoke original if different from current preview
          if (imageToRemove.originalPreviewUrl !== imageToRemove.previewUrl) {
            revokeImagePreview(imageToRemove.originalPreviewUrl)
          }
          if (imageToRemove.coverPreviewUrl) {
            revokeImagePreview(imageToRemove.coverPreviewUrl)
          }
        }
        const updatedImages = prev.filter((img) => img.id !== imageId)
        onImagesChange?.(updatedImages)
        return updatedImages
      })
    },
    [onImagesChange],
  )

  const openCropDialog = useCallback(
    (image: UploadedImage, mode: CropMode = 'free') => {
      setSelectedImageForCrop(image)
      setCropDialogInitialMode(mode)
      setCropDialogOpen(true)
    },
    [],
  )

  const handleCropComplete = useCallback(
    (croppedBlob: Blob, mode: CropMode) => {
      if (!selectedImageForCrop) return

      const timestamp = Date.now()

      if (mode === 'cover') {
        // Create cover file (1200x630 for OG meta)
        const coverFile = new File([croppedBlob], `cover-${timestamp}.webp`, {
          type: 'image/webp',
        })
        const coverPreviewUrl = createImagePreview(coverFile)

        setImages((prev) => {
          const updatedImages = prev.map((img) => {
            if (img.id === selectedImageForCrop.id) {
              // Revoke old cover preview if exists
              if (img.coverPreviewUrl) {
                revokeImagePreview(img.coverPreviewUrl)
              }
              return {
                ...img,
                isCover: true,
                coverFile,
                coverPreviewUrl,
              }
            }
            // Remove cover from other images
            if (img.isCover && img.coverPreviewUrl) {
              revokeImagePreview(img.coverPreviewUrl)
            }
            return {
              ...img,
              isCover: false,
              coverFile: undefined,
              coverPreviewUrl: undefined,
            }
          })
          onImagesChange?.(updatedImages)
          return updatedImages
        })

        toast.success('Cover image set successfully!')
      } else {
        // Free crop - update the file to be uploaded
        const editedFile = new File([croppedBlob], `edited-${timestamp}.webp`, {
          type: 'image/webp',
        })
        const editedPreviewUrl = createImagePreview(editedFile)

        setImages((prev) => {
          const updatedImages = prev.map((img) => {
            if (img.id === selectedImageForCrop.id) {
              // Revoke old edited preview if different from original
              if (img.previewUrl !== img.originalPreviewUrl) {
                revokeImagePreview(img.previewUrl)
              }
              return {
                ...img,
                file: editedFile,
                previewUrl: editedPreviewUrl,
                isEdited: true,
              }
            }
            return img
          })
          onImagesChange?.(updatedImages)
          return updatedImages
        })

        toast.success('Image edited successfully!')
      }

      setSelectedImageForCrop(null)
    },
    [selectedImageForCrop, onImagesChange],
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

        // Helper function to upload a single file
        const uploadSingleFile = async (file: File, isCover: boolean) => {
          // 1. Get presigned upload URL
          const uploadUrlResponse = await fetch(
            `/api/drawings/${drawingId}/upload`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mimeType: file.type,
                size: file.size,
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
            body: file,
            headers: {
              'Content-Type': file.type,
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
                mimeType: file.type,
                size: file.size,
                s3Key,
                isCover,
              }),
            },
          )

          if (!confirmResponse.ok) {
            const error = await confirmResponse.json()
            throw new Error(error.error || 'Failed to save asset')
          }

          const { asset } = await confirmResponse.json()
          return { asset, publicUrl }
        }

        // Upload the main image (not cover)
        const { asset, publicUrl } = await uploadSingleFile(image.file, false)

        // If this image has a cover file, upload it too
        if (image.isCover && image.coverFile) {
          await uploadSingleFile(image.coverFile, true)
        }

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

    // Check if a cover is set
    const hasCover = images.some((img) => img.isCover && img.coverFile)
    if (!hasCover && pendingImages.length > 0) {
      toast.error('Please set a cover image before uploading')
      // Open crop dialog for first pending image in cover mode
      const firstPending = pendingImages[0]
      setSelectedImageForCrop(firstPending)
      setCropDialogInitialMode('cover')
      setCropDialogOpen(true)
      return
    }

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
        <>
          <p className="text-xs text-muted-foreground">
            Click the crop icon to edit an image.
            {images.length > 1
              ? ' You can also set one as cover for social sharing.'
              : ''}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.map((image) => (
              <Card
                key={image.id}
                className={`group relative aspect-square overflow-hidden p-0 ${
                  image.isCover ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <img
                  src={image.previewUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                {/* Edited badge */}
                {image.isEdited && !image.isCover && (
                  <div className="absolute bottom-1 left-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Edited
                  </div>
                )}
                {/* Cover badge */}
                {image.isCover && (
                  <div className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Cover
                  </div>
                )}
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
                {/* Crop/Edit button - center of image */}
                {image.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => openCropDialog(image)}
                    className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 opacity-0 group-hover:opacity-100"
                    disabled={disabled}
                    title="Edit image"
                  >
                    <Crop className="h-5 w-5" />
                  </button>
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
        </>
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

      {/* Crop Dialog - always use original image for editing */}
      {selectedImageForCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open)
            if (!open) {
              setSelectedImageForCrop(null)
            }
          }}
          imageSrc={selectedImageForCrop.originalPreviewUrl}
          onCropComplete={handleCropComplete}
          initialMode={cropDialogInitialMode}
        />
      )}
    </div>
  )
}

export type { UploadedImage }
