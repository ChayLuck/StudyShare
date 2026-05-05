/**
 * Uploads a file buffer to Cloudinary.
 * For PDFs, we use resource_type: 'image' to enable thumbnail generation.
 */
export declare const uploadToStorage: (fileBuffer: Buffer, fileName: string, mimeType: string) => Promise<string>;
//# sourceMappingURL=storage.service.d.ts.map