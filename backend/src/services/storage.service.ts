import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configuration can also be handled natively if CLOUDINARY_URL is in .env 
// But we use discrete keys provided by the user
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!, 
  api_key: process.env.CLOUDINARY_API_KEY!, 
  api_secret: process.env.CLOUDINARY_API_SECRET! 
});

export const uploadToStorage = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Determine resource type: PDF is often best handled as raw or image depending on how it's viewed. 
    // Cloudinary natively supports PDF viewing via 'image' rendering, or 'raw' for direct download.
    // For documents like PDFs, ALWAYS use 'raw' to prevent Cloudinary from modifying/corrupting them
    const isPdf = mimeType === 'application/pdf';
    const resourceType = isPdf ? 'raw' : 'auto';

    let options: any = { 
      folder: "studyshare", 
      resource_type: resourceType 
    };

    if (isPdf) {
      // Force Cloudinary to keep an original-like file name and its extension (.pdf),
      // while preventing file overwrites by prefixing Date.now() and sanitizing.
      const safeName = fileName.replace(/[^a-zA-Z0-9.\-]/g, '_');
      options.public_id = `${Date.now()}_${safeName}`;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) {
          resolve(result.secure_url); // Returns the actual https URL!
        } else {
          console.error("Cloudinary failed:", error);
          reject(error);
        }
      }
    );
    
    // Inject the buffer using a readable stream pipe, as .end(buffer) sometimes yields 0kb files
    Readable.from(fileBuffer).pipe(uploadStream);
  });
};
