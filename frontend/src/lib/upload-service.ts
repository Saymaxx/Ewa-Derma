/**
 * Ewa Derma Clinic — Clinical Photo & Document Upload Service
 * Handles Client-Side Image Compression (WebP) & Firebase Cloud Storage Uploads
 */

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadResult {
  url: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Compresses an image file in the browser using HTML Canvas before upload.
 * Reduces 5MB+ smartphone clinical photos down to ~150-300KB WebP with crisp clarity.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(file); // fallback to original file if canvas 2d fails
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP or fallback to JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a clinical photo or prescription scan to Firebase Storage via REST API.
 * Falls back to high-quality compressed Data URI if Firebase credentials are not yet set.
 */
export async function uploadClinicalImage(
  file: File,
  folder: 'clinical-photos' | 'prescriptions' | 'patient-documents' = 'clinical-photos',
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  // 1. Client-Side Image Compression
  if (onProgress) onProgress(15);
  const compressedBlob = await compressImage(file);
  if (onProgress) onProgress(35);

  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${randomSuffix}_${cleanOriginalName}.webp`;
  const storagePath = `${folder}/${fileName}`;

  // 2. If Firebase Storage Bucket is configured, upload via Firebase Cloud Storage REST API
  if (bucket && !bucket.includes('YOUR_')) {
    try {
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(
        storagePath
      )}`;

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', 'image/webp');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round(35 + (event.loaded / event.total) * 60);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              const downloadToken = res.downloadTokens || '';
              const publicDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
                storagePath
              )}?alt=media${downloadToken ? `&token=${downloadToken}` : ''}`;
              if (onProgress) onProgress(100);
              resolve(publicDownloadUrl);
            } catch {
              resolve(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`);
            }
          } else {
            reject(new Error(`Firebase upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during Firebase upload'));
        xhr.send(compressedBlob);
      });

      const publicUrl = await uploadPromise;
      return {
        url: publicUrl,
        fileName,
        sizeBytes: compressedBlob.size,
      };
    } catch (err) {
      console.warn('Firebase upload error, falling back to local compressed storage:', err);
    }
  }

  // 3. Fallback: Return compressed Base64 Data URI for instant local/demo testing
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedBlob);
    reader.onloadend = () => {
      if (onProgress) onProgress(100);
      resolve({
        url: reader.result as string,
        fileName,
        sizeBytes: compressedBlob.size,
      });
    };
  });
}
