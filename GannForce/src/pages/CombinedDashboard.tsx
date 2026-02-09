import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { InstrumentCard } from "@/components/dashboard/InstrumentCard";

export default function CombinedDashboard() {
  const { instruments, loading, error, reportDate, sentimentSource, sentimentScrapedAt } =
    useDashboardData();

  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!sentimentScrapedAt) return;
    function update() {
      const diff = Date.now() - new Date(sentimentScrapedAt!).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) setTimeAgo(`${days}d ${hrs % 24}h ago`);
      else if (hrs > 0) setTimeAgo(`${hrs}h ${mins % 60}m ago`);
      else setTimeAgo(`${mins}m ago`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [sentimentScrapedAt]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trading recommendations from COT & Sentiment
          {reportDate && (
            <span className="ml-2 text-gray-400">&middot; COT Report: {reportDate}</span>
          )}
          {sentimentScrapedAt && (
            <span className="ml-2 text-gray-400">
              &middot; Scan: {new Date(sentimentScrapedAt).toLocaleString()}{" "}
              <span className="text-gray-300">({timeAgo})</span>
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {instruments.map((instrument) => (
          <InstrumentCard
            key={instrument.id}
            instrument={instrument}
            sentimentSource={sentimentSource}
          />
        ))}
      </div>
    </div>
  );
}
