import { uploadImage } from './imgbb';

/**
 * Resizes and compresses an image to compressed Base64.
 * Keeps output under ~100KB to fit easily in Firestore docs.
 */
async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limit maximum dimension to 800px to ensure a small file size
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.6 quality (looks super sharp but only takes ~40-80KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadDocumentToStorage(file: File, uid: string, docType: string): Promise<string> {
  try {
    const name = `${uid}_${docType}_${Date.now()}`;
    // Directly upload to ImgBB
    const downloadUrl = await uploadImage(file, name);
    return downloadUrl;
  } catch (error: any) {
    console.warn('[Storage] ImgBB upload failed, falling back to secure local base64 compression:', error?.message || error);
    try {
      // Return lightweight base64 instead
      const fallbackUrl = await compressImageToBase64(file);
      return fallbackUrl;
    } catch (fallbackError) {
      console.error('[Storage] Fallback compression failed as well:', fallbackError);
      throw error;
    }
  }
}
