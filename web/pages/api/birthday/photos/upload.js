import supabase from "@/supabaseClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const file = req.body.file; // Ensure we receive the file properly

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const filePath = `recruit/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("photos").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const publicUrl = supabase.storage.from("photos").getPublicUrl(filePath).publicUrl;
    
    res.status(200).json({ message: "Upload successful!", url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
}
