/**
 * ImgBB Image Upload Utility
 * Get free API key at: https://api.imgbb.com/
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/**
 * Upload a File or base64 string to ImgBB
 * @param fileOrBase64 - File object or base64 data URL
 * @param name - Optional image name
 * @returns - display_url of uploaded image
 */
export async function uploadToImgBB(fileOrBase64: File | Blob | string, name: string = ''): Promise<string> {
  if (!IMGBB_API_KEY || IMGBB_API_KEY === 'undefined') {
    throw new Error('ImgBB API key not set! Please add VITE_IMGBB_API_KEY in Settings.');
  }

  let base64Data: string;
  if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    base64Data = await fileToBase64(fileOrBase64);
  } else {
    base64Data = fileOrBase64;
  }

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const formData = new FormData();
  formData.append('image', cleanBase64);
  if (name) formData.append('name', name);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`ImgBB HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('ImgBB upload failed: ' + (data.error?.message || 'Unknown error'));
  }

  return data.data.image.url;
}

/**
 * Convert File to base64 data URL
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize image before upload (to reduce file size)
 */
export function resizeImage(file: File, maxWidth: number = 800, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
      }
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', quality);
    };
    img.src = url;
  });
}

/**
 * Full upload pipeline: resize → imgBB → return URL
 */
export async function uploadImage(file: File, name: string = '', maxWidth: number = 800): Promise<string> {
  const resized = await resizeImage(file, maxWidth, 0.85);
  try {
    if (!IMGBB_API_KEY || IMGBB_API_KEY === 'undefined' || IMGBB_API_KEY === '') {
      throw new Error('ImgBB API key is not configured');
    }
    return await uploadToImgBB(resized, name);
  } catch (error) {
    console.warn('[ImgBB] Upload failed or missing API Key, falling back to compressed local base64:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Base64 fallback conversion failed'));
      reader.readAsDataURL(resized);
    });
  }
}
