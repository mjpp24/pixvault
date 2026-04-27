import exifr from 'exifr'

/** Apply EXIF orientation to an image blob via canvas so pixels are always upright. */
async function applyOrientation(blob: Blob, orientation: number): Promise<Blob> {
  if (!orientation || orientation <= 1) return blob
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width: w, height: h } = img
      const swap = orientation >= 5
      const canvas = document.createElement('canvas')
      canvas.width  = swap ? h : w
      canvas.height = swap ? w : h
      const ctx = canvas.getContext('2d')!
      switch (orientation) {
        case 2: ctx.transform(-1, 0,  0,  1, w, 0); break
        case 3: ctx.transform(-1, 0,  0, -1, w, h); break
        case 4: ctx.transform( 1, 0,  0, -1, 0, h); break
        case 5: ctx.transform( 0, 1,  1,  0, 0, 0); break
        case 6: ctx.transform( 0, 1, -1,  0, h, 0); break
        case 7: ctx.transform( 0,-1, -1,  0, h, w); break
        case 8: ctx.transform( 0,-1,  1,  0, 0, w); break
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob) }
    img.src = url
  })
}

/**
 * Extract the embedded JPEG preview from a camera RAW file, with correct orientation baked in.
 * Strategy 1: exifr (fast, works for NEF/CR2/ARW/DNG/RAF etc.)
 * Strategy 2: binary JPEG marker scan of first 10 MB (works for CR3/ISOBMFF formats)
 */
export async function extractRawThumbnail(file: File | Blob, fileName?: string): Promise<Blob | null> {
  const f = file instanceof File ? file : new File([file], fileName ?? 'raw', { type: file.type })

  // Read EXIF orientation from the RAW container (not the embedded JPEG, which may lack it)
  let orientation = 1
  try {
    const parsed = await exifr.parse(f, { pick: ['Orientation'], translateValues: false })
    orientation = typeof parsed?.Orientation === 'number' ? parsed.Orientation : 1
  } catch { /* ignore */ }

  // exifr path — fastest for most traditional RAW formats
  try {
    const buffer = await exifr.thumbnail(f)
    if (buffer && buffer.length > 5000) {
      const raw = new Blob([buffer.buffer as ArrayBuffer], { type: 'image/jpeg' })
      return applyOrientation(raw, orientation)
    }
  } catch { /* fall through */ }

  // Binary JPEG scan — works for CR3 and any ISOBMFF-based container
  try {
    const scanSize = Math.min(file.size, 20 * 1024 * 1024)
    const bytes = new Uint8Array(await file.slice(0, scanSize).arrayBuffer())

    let bestStart = -1
    let bestLen = 0
    let i = 0

    while (i < bytes.length - 3) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        const start = i
        let j = i + 2
        while (j < bytes.length - 1) {
          if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
            const len = j + 2 - start
            if (len > bestLen) { bestStart = start; bestLen = len }
            i = j + 2
            break
          }
          j++
        }
        if (j >= bytes.length - 1) break
      } else {
        i++
      }
    }

    if (bestStart >= 0 && bestLen > 20000) {
      const raw = new Blob([bytes.slice(bestStart, bestStart + bestLen)], { type: 'image/jpeg' })
      return applyOrientation(raw, orientation)
    }
  } catch { /* fall through */ }

  return null
}
