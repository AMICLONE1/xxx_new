import { supabase } from './client';

class SupabaseStorageService {
  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Blob | File,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<{ path: string; url: string }> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert || false,
    });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      path: data.path,
      url: publicUrl,
    };
  }

  /**
   * Upload KYC document
   */
  async uploadKYCDocument(
    userId: string,
    documentType: string,
    file: Blob | File
  ): Promise<string> {
    const fileName = `${userId}/${documentType}_${Date.now()}.${this.getFileExtension(file)}`;
    const path = `${userId}/${fileName}`;

    const { url } = await this.uploadFile('kyc-documents', path, file, {
      contentType: file.type,
    });

    return url;
  }

  /**
   * Upload electricity bill
   */
  async uploadElectricityBill(userId: string, file: Blob | File): Promise<string> {
    const fileName = `${userId}/bill_${Date.now()}.${this.getFileExtension(file)}`;
    const path = `${userId}/${fileName}`;

    const { url } = await this.uploadFile('electricity-bills', path, file, {
      contentType: file.type,
    });

    return url;
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(userId: string, file: Blob | File): Promise<string> {
    const fileName = `${userId}/profile_${Date.now()}.${this.getFileExtension(file)}`;
    const path = `${userId}/${fileName}`;

    const { url } = await this.uploadFile('profile-images', path, file, {
      contentType: file.type,
      upsert: true, // Replace existing profile image
    });

    return url;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Get signed URL for private file (expires in 1 hour by default)
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  }

  /**
   * List files in a bucket folder
   */
  async listFiles(bucket: string, folder?: string): Promise<string[]> {
    const { data, error } = await supabase.storage.from(bucket).list(folder || '');

    if (error) throw error;

    return data?.map((file) => file.name) || [];
  }

  /**
   * Get file extension from file
   */
  private getFileExtension(file: Blob | File): string {
    if (file instanceof File) {
      return file.name.split('.').pop() || 'jpg';
    }
    // For Blob, try to infer from type
    const type = file.type;
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
    if (type.includes('png')) return 'png';
    if (type.includes('pdf')) return 'pdf';
    return 'jpg'; // default
  }
}

export const supabaseStorageService = new SupabaseStorageService();

