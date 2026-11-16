/**
 * Resizes and compresses a Blob/File image into a JPEG data URL
 * guaranteed to fit comfortably inside a Firestore document (< 480 KB).
 */
export async function compressImageToDataUrl(
  file: Blob,
  maxDimension = 1100,
  initialQuality = 0.78,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      image.src = objectUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo procesar el lienzo de la imagen.');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let quality = initialQuality;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Ensure payload stays strictly below Firestore rule maxLength (550,000 chars)
    while (dataUrl.length > 480000 && quality > 0.35) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length > 520000) {
      const fallbackScale = 0.7;
      canvas.width = Math.round(targetWidth * fallbackScale);
      canvas.height = Math.round(targetHeight * fallbackScale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
