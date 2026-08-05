import { useState, useEffect } from "react";

interface RSVPModalProps {
  onClose: () => void;
}

export default function RSVPModal({ onClose }: RSVPModalProps) {
  const [rsvpName, setRsvpName] = useState("");
  const [plusOne, setPlusOne] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
    return () => {
      document.body.style.overflow = "auto"; // Restore scrolling when modal closes
    };
  }, []);

  const handleSubmit = async () => {
    if (!rsvpName.trim()) return alert("Please enter your name!");

    const rsvpData = [{ name: rsvpName, plus: plusOne }];

    try {
      const response = await fetch("/api/rsvp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rsvpData),
      });

      if (!response.ok) throw new Error("Failed to submit RSVP");

      document.body.style.overflow = "auto"; // Restore scrolling
      onClose();
    } catch (error) {
      console.error("RSVP submission error:", error);
      alert("Error submitting RSVP");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 ">
      <div className="bg-gray-800 border-4 border-gray-500 p-6 shadow-lg retro-window relative w-80">
        {/* Close Button */}
        <button
          className="absolute top-2 right-2 text-white bg-red-600 px-2 py-1 text-sm hover:bg-red-700"
          onClick={onClose}
        >
          X
        </button>

        <h2 className="text-lg font-bold mb-4 text-white">
          RSVP for Ethan&apos;s Party
        </h2>

        <label className="block text-white mb-2">Your Name:</label>
        <input
          type="text"
          className="w-full p-2 border border-gray-600 bg-gray-900 text-white"
          value={rsvpName}
          onChange={(e) => setRsvpName(e.target.value)}
        />

        <label className="block text-white mt-4 mb-2">Plus Ones:</label>
        <input
          type="number"
          className="w-full p-2 border border-gray-600 bg-gray-900 text-white"
          value={plusOne === 0 ? "" : plusOne}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "") {
              setPlusOne(0);
            } else {
              const numberValue = Number(value);
              if (numberValue >= 0) {
                setPlusOne(numberValue);
              }
            }
          }}
          min={0}
        />

        <div className="flex justify-end mt-4 space-x-2">
          <button
            className="px-4 py-2 bg-gray-500 border border-gray-700 shadow-md hover:bg-gray-600 active:shadow-inner text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-gray-300 border border-gray-700 shadow-md hover:bg-gray-400 active:shadow-inner"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
