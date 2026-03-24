// We are fully replacing Firebase Cloud Storage with Base64 Firestore storage to stay 100% free!

const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Calculate new dimensions keeping aspect ratio
        let newWidth = img.width;
        let newHeight = img.height;
        
        if (img.width > maxWidth) {
          newWidth = maxWidth;
          newHeight = (img.height * maxWidth) / img.width;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas not supported");
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Export as WebP/JPEG with 0.6 quality to keep size tiny (well under 1MB Firestore limit)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const uploadProfileImage = async (file: File, uid: string) => {
  // Compress to 300px for profile pictures (tiny size)
  return await compressImage(file, 300);
};

export const uploadReceipts = async (files: File[], expenseId: string) => {
  // Compress to 800px for receipts to maintain readability
  const urls = await Promise.all(
    files.map(async (file) => {
      return await compressImage(file, 800);
    })
  );
  return urls;
};
