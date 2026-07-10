import { useState, useEffect } from "react";
import API_BASE, { fetchWithTimeout } from "../api";

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    fetchWithTimeout(`${API_BASE}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.announcement) setAnnouncement(data.announcement);
      })
      .catch(() => {});
  }, []);

  if (!announcement) return null;

  return (
    <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white text-center py-2 px-4 font-bold text-sm shadow-md animate-fade-in relative z-[100]">
      {announcement}
    </div>
  );
}
