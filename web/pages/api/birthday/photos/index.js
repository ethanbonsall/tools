import supabase from "@/supabaseClient.js";


export default async function handler(req, res) {
  // Ensure we are only responding to GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  //Try to get all photos from supabase photos/uploads bucket. Catch errors. 
  try {
    const { data, error } = await supabase.storage.from("photos").list("recruit");

    if (error) throw error;
    // Map through the data to get the public URLs for each file
    const photoUrls = data.map((file) => {
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(`recruit/${file.name}`);
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
