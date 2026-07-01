import cloudinary from '../config/cloudinary.js';

/**
 * Uploads an image buffer directly to Cloudinary with compression and resizing.
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} folder - The Cloudinary folder target (e.g. 'renuka-tours/packages').
 * @returns {Promise<string>} - Resolves with the secure delivery URL.
 */
export const uploadSingleImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder || 'renuka-tours',
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Auto resize down to max 1200px box
          { quality: 'auto' },                          // Intelligent quality compression
          { fetch_format: 'auto' }                      // WebP/AVIF auto formats delivery
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};
