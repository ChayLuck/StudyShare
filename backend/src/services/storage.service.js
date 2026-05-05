"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToStorage = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
// Configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
/**
 * Uploads a file buffer to Cloudinary.
 * For PDFs, we use resource_type: 'image' to enable thumbnail generation.
 */
const uploadToStorage = async (fileBuffer, fileName, mimeType) => {
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    // Use 'image' for PDFs so Cloudinary can generate thumbnails (pg_1, etc.)
    const resourceType = isPdf ? 'image' : 'auto';
    const options = {
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
    const tempFilePath = path_1.default.join(os_1.default.tmpdir(), `upload_${Date.now()}_${fileName}`);
    try {
        fs_1.default.writeFileSync(tempFilePath, fileBuffer);
        const result = await cloudinary_1.v2.uploader.upload(tempFilePath, options);
        console.log(`✅ Cloudinary upload success: ${result.secure_url}`);
        return result.secure_url;
    }
    catch (error) {
        console.error("❌ Cloudinary failed:", error);
        throw error;
    }
    finally {
        // Cleanup temp file
        if (fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.unlinkSync(tempFilePath);
        }
    }
};
exports.uploadToStorage = uploadToStorage;
//# sourceMappingURL=storage.service.js.map