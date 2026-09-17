/**
 * Checks if the browser supports rendering and exporting to WebP format.
 */
export const isWebPSupported = () => {
  try {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * Compresses an image file on the client-side using Canvas.
 * Converts to WebP by default if supported, otherwise exports as JPEG.
 * 
 * @param {File} file The original file object.
 * @param {Object} options Compression configuration options.
 * @param {number} options.maxSizeKB Target maximum file size in kilobytes.
 * @param {number} options.quality Initial quality factor (0.0 to 1.0).
 * @param {number} options.maxWidth Maximum width dimension to scale down safely.
 * @param {number} options.maxHeight Maximum height dimension to scale down safely.
 * @returns {Promise<{compressedFile: File, originalSize: number, compressedSize: number, optimized: boolean}>}
 */
export const compressImage = (file, options = {}) => {
  const {
    maxSizeKB = 300,
    quality = 0.8,
    maxWidth = 1200,
    maxHeight = 1200
  } = options;

  const originalSize = file.size;

  // Skip compression entirely if the file is already under 50KB or smaller than target
  if (originalSize < 50 * 1024 || originalSize < maxSizeKB * 1024) {
    return Promise.resolve({
      compressedFile: file,
      originalSize,
      compressedSize: originalSize,
      optimized: false
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Calculate safe dimensions preserving aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output MIME type
        const format = isWebPSupported() ? 'image/webp' : 'image/jpeg';
        const extension = format === 'image/webp' ? '.webp' : '.jpg';
        const outFileName = file.name.replace(/\.[^/.]+$/, "") + extension;

        const attemptBlobExport = (currentQuality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback to original if blob creation fails
                resolve({
                  compressedFile: file,
                  originalSize,
                  compressedSize: originalSize,
                  optimized: false
                });
                return;
              }

              // If the result is still larger than the threshold and quality is reasonable, retry with lower quality
              if (blob.size > maxSizeKB * 1024 && currentQuality > 0.4) {
                attemptBlobExport(currentQuality - 0.1);
              } else {
                // Create a new File object from the blob
                const compressedFile = new File([blob], outFileName, {
                  type: format,
                  lastModified: Date.now()
                });

                resolve({
                  compressedFile,
                  originalSize,
                  compressedSize: compressedFile.size,
                  optimized: true
                });
              }
            },
            format,
            currentQuality
          );
        };

        attemptBlobExport(quality);
      };
      img.onerror = (err) => reject(new Error('Image loading failed: ' + err.message));
    };
    reader.onerror = (err) => reject(new Error('FileReader failed: ' + err.message));
  });
};
