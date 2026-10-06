import { supabase } from '../supabase-client';

/**
 * Converts a Base64 image string to a Blob and uploads it to Supabase Storage.
 * If the string is already a URL or empty, it returns it unchanged.
 * 
 * @param base64String The Base64 image data string (or existing URL)
 * @param folder The bucket folder to organize the file (e.g., 'attendance', 'field-proofs')
 * @param identifier Unique identifier for the filename (e.g., employeeId)
 * @returns The public URL of the uploaded image
 */
export async function uploadBase64Photo(base64String: string | undefined, folder: string, identifier: string): Promise<string | undefined> {
  // 1. If it's missing, already a URL, or not base64, just return it
  if (!base64String || base64String.startsWith('http') || !base64String.startsWith('data:image')) {
    return base64String;
  }

  try {
    // 2. Convert Base64 text to a real image Blob
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    // 3. Generate a clean, unique file name
    const fileName = `${folder}/${identifier}_${Date.now()}.jpg`;

    // 4. Upload file to Supabase Bucket 'hrms-photos'
    const { data, error } = await supabase.storage
      .from('hrms-photos')
      .upload(fileName, blob, { 
        contentType: 'image/jpeg',
        upsert: false 
      });

    if (error) {
      console.error("Storage upload error:", error);
      return base64String; // Fallback to base64 if bucket upload fails
    }

    // 5. Get and return the short Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('hrms-photos')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (err) {
    console.error("Failed to process Base64 string for upload:", err);
    return base64String; // Fallback to base64 on complete failure
  }
}
