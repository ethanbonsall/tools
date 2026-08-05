import supabase from "@/supabaseClient.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { error } = await supabase.from("songs").delete().neq("id", "");    // Delete all

    if (error) throw error;

    res.status(200).json({ message: "All songs deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete songs", error: error.message });
  }
}
