"use client";

import { useEffect, useState } from "react";

export default function ClientTimestamp({ timestamp }: { timestamp: string }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = ("0" + (hours % 12 || 12)).slice(-2);
    const formattedMinutes = ("0" + minutes).slice(-2);
    setFormatted(`${formattedHours}:${formattedMinutes} ${ampm}`);
  }, [timestamp]);

  return <span className="text-xs text-gray-400">{formatted}</span>;
}
