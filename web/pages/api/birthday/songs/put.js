import supabase from "@/supabaseClient.js";

export default async function handler(req, res) {
  console.log("Received request method:", req.method); // 🔍 Debugging

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const newSongs = req.body;
    console.log("Received song data:", newSongs); // 🔍 Debugging

    const { data, error } = await supabase
      .from("songs")
      .upsert(newSongs, { onConflict: ["id"] });

    if (error) throw error;

    res.status(200).json({ message: "Songs updated successfully!", data });
  } catch (error) {
    console.error("Error updating songs:", error);
    res.status(500).json({ message: "Failed to save songs", error: error.message });
  }
}

