// Helper pour upload vers le bucket rhythm-documents

export async function uploadToRhythmBucket(
  supabaseServiceClient: any,
  path: string,
  file: File
): Promise<{ path: string }> {
  const { error } = await supabaseServiceClient.storage
    .from("rhythm-documents")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload rhythm-documents échoué: ${error.message}`);
  }

  return { path };
}
