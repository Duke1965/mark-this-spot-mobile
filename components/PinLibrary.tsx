"use client";

import { useState } from "react";

export default function PinLibrary() {
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos" | "pins" | "recommendations">("photos");

  const renderContent = () => {
    return (
      <div className="mt-4 text-center text-gray-500">
        <p>No items yet in <span className="capitalize">{selectedTab}</span>.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">📚 PINIT Library</h1>

      <div className="flex justify-around mb-6">
        <Tab label="Photos" tab="photos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Videos" tab="videos" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Pinned" tab="pins" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <Tab label="Recommendations" tab="recommendations" selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      </div>

      {renderContent()}
    </div>
  );
}

function Tab({
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
    <but
