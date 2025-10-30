"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { createChannel, ChannelData } from "@/app/api";
import { useSearchParams } from "next/navigation";

const AddChannel: React.FC = () => {
  const searchParams = useSearchParams();
  const serverId = searchParams.get("serverId");

  const [formData, setFormData] = useState<ChannelData>({
    name: "",
    type: "text",
    is_private: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

 const handleChange = (
   e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
 ) => {
   const target = e.target;
   const { name, value, type } = target;

   setFormData((prev) => ({
     ...prev,
     [name]: type === "checkbox" ? (target as HTMLInputElement).checked : value,
   }));
 };


  const validatePayload = (): string | null => {
    if (!serverId) return "Missing server ID in URL.";
    if (!formData.name || formData.name.trim().length < 1)
      return "Channel name cannot be empty.";
    if (!["text", "voice"].includes(formData.type))
      return "Invalid channel type.";
    return null;
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = validatePayload();
    if (error) {
      setMessage(error);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      console.log("Submitting channel:", { serverId, ...formData });

      const response = await createChannel(serverId!, formData);

      console.log("Server response:", response);

      setMessage(" Channel created successfully!");
      setFormData({ name: "", type: "text", is_private: false });
    } catch (err: any) {
      console.error("Error creating channel:", err);

    
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        " Failed to create channel.";
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center px-6 py-10">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Create Channel
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Channel Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter channel name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>

         
          <div className="mt-4">
            <label className="block text-gray-700 font-semibold mb-1">
              Channel Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="text">Text</option>
              <option value="voice">Voice</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-400 border-gray-300 rounded"
            />
            <label className="text-gray-700 font-medium">Private Channel</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>

          {message && (
            <p className="text-center text-sm font-medium mt-3 text-gray-800">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddChannel;
