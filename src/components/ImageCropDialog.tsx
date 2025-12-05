import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// OG Image aspect ratio: 1200x630 = 1.91:1
const OG_ASPECT_RATIO = 1200 / 630

// Maximum output dimensions for regular images
const MAX_OUTPUT_WIDTH = 1920
const MAX_OUTPUT_HEIGHT = 1920

export type CropMode = 'free' | 'cover'

interface ImageCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (croppedImageBlob: Blob, mode: CropMode) => void
  initialMode?: CropMode
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  initialMode = 'free',
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState<CropMode>(initialMode)

  const aspect = mode === 'cover' ? OG_ASPECT_RATIO : undefined

  const onCropChange = useCallback((location: Point) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation)
  }, [])

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    [],
  )

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }, [])

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 1))
  }, [])

  const handleModeChange = useCallback((newMode: CropMode) => {
    setMode(newMode)
    // Reset crop position when changing mode
    setCrop({ x: 0, y: 0 })
  }, [])

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        mode,
      )
      onCropComplete(croppedBlob, mode)
      onOpenChange(false)
      // Reset state for next use
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setMode(initialMode)
    } catch (error) {
      console.error('Failed to crop image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [
    croppedAreaPixels,
    rotation,
    imageSrc,
    mode,
    onCropComplete,
    onOpenChange,
    initialMode,
  ])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setMode(initialMode)
  }, [onOpenChange, initialMode])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[95vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
          <DialogDescription>
            Crop, rotate, and adjust your image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('free')}
            >
              Free Crop
            </Button>
            <Button
              type="button"
              variant={mode === 'cover' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('cover')}
            >
              Cover (1.91:1)
            </Button>
          </div>

          {mode === 'cover' && (
            <p className="text-xs text-muted-foreground">
              Cover images are used for social sharing (Open Graph). Output:
              1200×630px
            </p>
          )}

          {/* Cropper container */}
          <div className="relative h-[40vh] w-full overflow-hidden rounded-lg bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              onCropComplete={onCropCompleteCallback}
              showGrid
              style={{
                containerStyle: {
                  borderRadius: '0.5rem',
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom control */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-14">Zoom</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Rotation control */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-14">Rotate</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateLeft}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateRight}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-10 text-right">
                {Math.round(rotation)}°
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing
              ? 'Processing...'
              : mode === 'cover'
                ? 'Set as Cover'
                : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Creates a cropped image from the source image
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  mode: CropMode = 'free',
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const rotRad = getRadianAngle(rotation)

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  )

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // Translate canvas context to center and rotate
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)

  // Draw rotated image
  ctx.drawImage(image, 0, 0)

  // Create new canvas for the cropped area
  const outputCanvas = document.createElement('canvas')
  const outputCtx = outputCanvas.getContext('2d')

  if (!outputCtx) {
    throw new Error('No 2d context')
  }

  let outputWidth: number
  let outputHeight: number

  if (mode === 'cover') {
    // Fixed output for cover images: 1200x630
    outputWidth = 1200
    outputHeight = 630
  } else {
    // For free crop, use the cropped area dimensions (scaled down if too large)
    outputWidth = pixelCrop.width
    outputHeight = pixelCrop.height

    // Scale down if exceeds max dimensions
    if (outputWidth > MAX_OUTPUT_WIDTH || outputHeight > MAX_OUTPUT_HEIGHT) {
      const scale = Math.min(
        MAX_OUTPUT_WIDTH / outputWidth,
        MAX_OUTPUT_HEIGHT / outputHeight,
      )
      outputWidth = Math.round(outputWidth * scale)
      outputHeight = Math.round(outputHeight * scale)
    }
  }

  outputCanvas.width = outputWidth
  outputCanvas.height = outputHeight

  // Draw the cropped area scaled to output dimensions
  outputCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  // Convert to blob
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      },
      'image/webp',
      0.9,
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.crossOrigin = 'anonymous'
    image.src = url
  })
}

function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}
