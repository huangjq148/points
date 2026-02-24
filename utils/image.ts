export const compressImage = (file: File, maxSize = 2000, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width / 2;
        let height = img.height / 2;

        // if (width > height && width > maxSize) {
        //   height = (height * maxSize) / width;
        //   width = maxSize;
        // } else if (height > maxSize) {
        //   width = (width * maxSize) / height;
        //   height = maxSize;
        // }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              resolve(new File([blob], compressedName, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
    };
  });
};
