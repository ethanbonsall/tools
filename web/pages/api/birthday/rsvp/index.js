import supabase from "@/supabaseClient.js";

export default async function handler(req, res) {
  console.log("Received request method:", req.method); // Debugging

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const newRSVPs = req.body;
    console.log("Received RSVP data:", newRSVPs); // Debugging

    // Validate input
    if (!Array.isArray(newRSVPs) || newRSVPs.some(rsvp => !rsvp.name || typeof rsvp.plus !== "number")) {
      return res.status(400).json({ message: "Invalid RSVP data format" });
    }

    const { data, error } = await supabase
      .from("rsvp")
      .upsert(newRSVPs, { onConflict: ["name"] });

    if (error) throw error;

    res.status(200).json({ message: "RSVPs updated successfully!", data });
  } catch (error) {
    console.error("Error updating RSVPs:", error);
    res.status(500).json({ message: "Failed to save RSVPs", error: error.message });
  }
}

