import { z } from 'zod';

export const submitKycSchema = z.object({
    documentType: z.enum(['aadhaar', 'pan', 'gst', 'bill']),
    documentImageUri: z.string().min(1, 'Document URL required'), // allow string, strict url() might fail on local paths or partial URIs
    extractedData: z.record(z.string(), z.any()).optional() // Allow any object for extracted data
});
