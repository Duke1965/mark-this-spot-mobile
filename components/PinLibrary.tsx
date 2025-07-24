"use client";

import { useState } from "react";

const mockData = {
  photos: ["photo1.jpg", "photo2.jpg"],
  videos: ["video1.mp4", "video2.mp4"],
  pins: ["Farm Stall near N2", "Old Lighthouse"],
  recommendations: ["Leo’s Biltong Stop", "Hidden Viewpoint"],
};

export default function PinLibrary() {
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos" | "pins" | "recommendations">("photos");

  return (
    <div className="min-h-screen bg-yellow-50 text-black p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">📚 PINIT Library</h1>
      <p className="text-center text-sm mb-4">Currently viewing: <strong>{selectedTab}</strong></p>

      <div className="flex justify-around mb-6">
        <Tab label="Photos" tab="photos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Videos" tab="videos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Pinned" tab="pins" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Recommendations" tab="recommendations" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      </div>

      <div className="space-y-2">
        {mockData[selectedTab].map((item, idx) => (
          <div key={idx} className="bg-white text-black rounded p-3 shadow border">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tab({ label, tab, selectedTab, setSelectedTab }: any) {
  const isActive = selectedTab === tab;
  return (
    <button
      onClick={() => setSelectedTab(tab)}
      className={`px-3 py-2 rounded-full text-sm font-semibold transition-all ${
        isActive ? "bg-black text-white" : "bg-gray-300 text-black"
      }`}
    >
      {label}
    </button>
  );
}
