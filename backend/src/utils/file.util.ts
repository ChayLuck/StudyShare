export const checkMagicNumbers = (buffer: Buffer): boolean => {
  // Check max 4 bytes for magic numbers
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  // Accepted Magic Numbers (add more as needed)
  // PDF: 25 50 44 46 (25504446)
  // JPEG: FF D8 FF E0 (FFD8FFE0), FF D8 FF E1 (FFD8FFE1)
  // PNG: 89 50 4E 47 (89504E47)
  // DOCX / XLSX: 50 4B 03 04 (504B0304) // ZIP format
  
  const acceptedSignatures = [
    '25504446', // PDF
    'FFD8FFE0', // JPEG
    'FFD8FFE1', // JPEG
    'FFD8FFE2', // JPEG
    '89504E47', // PNG
    '504B0304', // Office Open XML (docx, xlsx, pptx)
  ];
  
  // Excluded specifically (although it's safer to use an allowlist approach above)
  // MP4 usually has 'ftyp' at 4 bytes offset: hex varies, but starts with e.g. 0000001866747970
  
  // We use strict allowlist
  return acceptedSignatures.some(sig => hex.startsWith(sig));
};
