import imageCompression from 'browser-image-compression'

type Options = Partial<{
  maxSizeMB: number // (default: Number.POSITIVE_INFINITY)
  maxWidthOrHeight: number // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight (default: undefined)
  // but, automatically reduce the size to smaller than the maximum Canvas size supported by each browser.
  // Please check the Caveat part for details.
  onProgress: (progress: number) => void // optional, a function takes one progress argument (percentage from 0 to 100)
  useWebWorker: boolean // optional, use multi-thread web worker, fallback to run in main-thread (default: true)
  libURL: string // optional, the libURL of this library for importing script in Web Worker (default: https://cdn.jsdelivr.net/npm/browser-image-compression/dist/browser-image-compression.js)
  preserveExif: boolean // optional, use preserve Exif metadata for JPEG image e.g., Camera model, Focal length, etc (default: false)

  signal: AbortSignal // optional, to abort / cancel the compression

  // following options are for advanced users
  maxIteration: number // optional, max number of iteration to compress the image (default: 10)
  exifOrientation: number // optional, see https://stackoverflow.com/a/32490603/10395024
  fileType: string // optional, fileType override e.g., 'image/jpeg', 'image/png' (default: file.type)
  initialQuality: number // optional, initial quality value between 0 and 1 (default: 1)
  alwaysKeepResolution: boolean // optional, only reduce quality, always keep width and height (default: false)
}>
// Allowed image MIME types (browser-supported formats)
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

// Default compression options
const DEFAULT_COMPRESSION_OPTIONS: Options = {
  maxSizeMB: 1, // Maximum file size in MB
  maxWidthOrHeight: 1920, // Maximum width/height dimension
  useWebWorker: true, // Use web worker for better performance
  fileType: 'image/webp', // Convert to WebP for better compression
}

/**
 * Validates if a file is an allowed image type
 */
export function isAllowedImageType(
  mimeType: string,
): mimeType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)
}

/**
 * Gets the file extension from a MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return mimeToExt[mimeType] || 'jpg'
}

/**
 * Compresses an image file on the client side
 */
export async function compressImage(
  file: File,
  options?: Partial<Options>,
): Promise<File> {
  // Validate file type
  if (!isAllowedImageType(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    )
  }

  const compressionOptions = {
    ...DEFAULT_COMPRESSION_OPTIONS,
    ...options,
  }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    throw new Error('Failed to compress image')
  }
}

/**
 * Compresses multiple images
 */
export async function compressImages(
  files: Array<File>,
  options?: Partial<Options>,
): Promise<Array<File>> {
  const compressionPromises = files.map((file) => compressImage(file, options))
  return Promise.all(compressionPromises)
}

/**
 * Creates a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revokes a preview URL to free memory
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url)
}
