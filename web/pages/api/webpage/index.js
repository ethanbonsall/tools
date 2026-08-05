import supabase from "@/supabaseClient.js";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Ensure we are listing files under "webpage" inside the "uploads" bucket
    const { data, error } = await supabase.storage.from("webpage").list("uploads");

    if (error) throw error;

    const photoUrls = data.map((file) => {
      const { data: urlData } = supabase.storage.from("webpage").getPublicUrl(`uploads/${file.name}`);
      return {
        name: file.name,
        url: urlData.publicUrl, 
      };
    });

    res.status(200).json(photoUrls);
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).json({ message: "Failed to fetch photos", error: error.message });
  }
}
