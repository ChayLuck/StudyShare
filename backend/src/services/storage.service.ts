import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!, 
  api_key: process.env.CLOUDINARY_API_KEY!, 
  api_secret: process.env.CLOUDINARY_API_SECRET! 
});

/**
 * Uploads a file buffer to Cloudinary.
 * For PDFs, we use resource_type: 'image' to enable thumbnail generation.
 */
export const uploadToStorage = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  
  // Use 'image' for PDFs so Cloudinary can generate thumbnails (pg_1, etc.)
  const resourceType = isPdf ? 'image' : 'auto';

  const options: any = { 
    folder: "studyshare", 
    resource_type: resourceType
  };

  if (isPdf) {
    // Sanitize and ensure public_id ends with .pdf so Cloudinary recognizes it
    const safeName = fileName.replace(/[^a-zA-Z0-9\-]/g, '_').replace(/\.pdf$/i, '');
    options.public_id = `${Date.now()}_${safeName}`;
    options.format = 'pdf'; // Explicitly set format to pdf
  }

  // Use disk-based upload for maximum reliability (avoids 0kb stream issues)
  const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${fileName}`);
  
  try {
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    const result = await cloudinary.uploader.upload(tempFilePath, options);
    console.log(`✅ Cloudinary upload success: ${result.secure_url}`);
    
    return result.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary failed:", error);
    throw error;
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};
