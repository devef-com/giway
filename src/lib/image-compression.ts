// Server URL for image compression (from environment variable)
const IMAGE_COMPRESS_HOST = import.meta.env.VITE_IMAGE_COMPRESS_HOST || ''

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
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heif',
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
 * Compresses an image file using the server-side compression service
 */
async function compressImageServer(file: File): Promise<File> {
  if (!IMAGE_COMPRESS_HOST) {
    throw new Error('IMAGE_COMPRESS_HOST is not configured')
  }

  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${IMAGE_COMPRESS_HOST}/convert`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Server compression failed: ${response.statusText}`)
  }

  const blob = await response.blob()
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^/.]+$/, '.webp'),
    { type: 'image/webp' },
  )

  return compressedFile
}

/**
 * Compresses an image file on the client side
 */
async function compressImageClient(
  file: File,
  options?: Partial<Options>,
): Promise<File> {
  const compressionOptions = {
    ...DEFAULT_COMPRESSION_OPTIONS,
    ...options,
  }

  // Dynamic import to avoid server-side bundling issues
  const imageCompression = (await import('browser-image-compression')).default
  const compressedFile = await imageCompression(file, compressionOptions)
  return compressedFile
}

/**
 * Compresses an image file - tests both client and server compression in parallel
 * and returns the server result if available, falling back to client compression
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

  const startTime = performance.now()

  // Run both compression methods in parallel for testing
  const clientPromise = compressImageClient(file, options)
    .then((result) => {
      const duration = performance.now() - startTime
      console.log(
        `[Image Compression] Client: ${duration.toFixed(0)}ms, size: ${(result.size / 1024).toFixed(1)}KB`,
      )
      return { source: 'client' as const, file: result, duration }
    })
    .catch((error) => {
      console.error('[Image Compression] Client failed:', error)
      return {
        source: 'client' as const,
        error,
        duration: performance.now() - startTime,
      }
    })

  const serverPromise = IMAGE_COMPRESS_HOST
    ? compressImageServer(file)
        .then((result) => {
          const duration = performance.now() - startTime
          console.log(
            `[Image Compression] Server: ${duration.toFixed(0)}ms, size: ${(result.size / 1024).toFixed(1)}KB`,
          )
          return { source: 'server' as const, file: result, duration }
        })
        .catch((error) => {
          console.error('[Image Compression] Server failed:', error)
          return {
            source: 'server' as const,
            error,
            duration: performance.now() - startTime,
          }
        })
    : Promise.resolve({
        source: 'server' as const,
        error: new Error('Server not configured'),
        duration: 0,
      })

  const [clientResult, serverResult] = await Promise.all([
    clientPromise,
    serverPromise,
  ])

  // Log comparison results
  console.log('[Image Compression] Comparison:', {
    original: `${(file.size / 1024).toFixed(1)}KB`,
    client:
      'file' in clientResult
        ? `${(clientResult.file.size / 1024).toFixed(1)}KB in ${clientResult.duration.toFixed(0)}ms`
        : 'failed',
    server:
      'file' in serverResult
        ? `${(serverResult.file.size / 1024).toFixed(1)}KB in ${serverResult.duration.toFixed(0)}ms`
        : 'failed',
  })

  // Prefer server result if available, fall back to client
  if ('file' in serverResult) {
    return serverResult.file
  }

  if ('file' in clientResult) {
    return clientResult.file
  }

  throw new Error('Both compression methods failed')
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
