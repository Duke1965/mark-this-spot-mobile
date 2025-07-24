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

  const renderContent = () => {
    const items = mockData[selectedTab];
    return (
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="bg-white text-black rounded-lg px-4 py-2 shadow">
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">📚 Your Library</h1>

      <div className="flex justify-around mb-6">
        <TabButton label="Photos" tab="photos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <TabButton label="Videos" tab="videos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <TabButton label="Pinned" tab="pins" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <TabButton label="Recommendations" tab="recommendations" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      </div>

      {renderContent()}
    </div>
  );
}

function TabButton({
  label,
  tab,
  selectedTab,
  setSelectedTab,
}: {
  label: string;
  tab: "photos" | "videos" | "pins" | "recommendations";
  selectedTab: string;
  setSelectedTab: (tab: any) => void;
}) {
  const isActive = selectedTab === tab;
  return (
    <button
      onClick={() => setSelectedTab(tab)}
      className={`px-3 py-2 rounded-full text-sm font-semibold transition-all ${
        isActive
          ? "bg-black text-white shadow-md scale-105"
          : "bg-gray-300 text-gray-800 hover:bg-gray-400"
      }`}
    >
      {label}
    </button>
  );
}
