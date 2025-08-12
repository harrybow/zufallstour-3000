interface ImageOptions {
  maxSize?: number
  mimeType?: string
  quality?: number
}

export async function fileToDataUrl(file: File, options: ImageOptions = {}): Promise<string | ArrayBuffer | null> {
  const {
    maxSize = 1600,
    mimeType = 'image/webp',
    quality = 0.8,
  } = options;

  // Fallback: simple data URL if anything fails
  async function fallback(): Promise<string | ArrayBuffer | null> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      image.src = url;
    });

    let { width, height } = img;
    if (width > height && width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }

    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: mimeType, quality })
      : await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return fallback();
  }
}
