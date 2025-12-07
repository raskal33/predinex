"use client";

import StatsDashboard from "@/components/StatsDashboard";

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-bg-main">
      <div className="container mx-auto px-4 py-8">
        <StatsDashboard />
      </div>
    </div>
  );
}