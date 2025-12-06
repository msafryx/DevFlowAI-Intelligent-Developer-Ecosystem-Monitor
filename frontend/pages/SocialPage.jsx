// src/pages/SocialPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function SocialPage() {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    avgLength: 0,
    postsInSample: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSocialDetails();
  }, []);

  async function fetchSocialDetails() {
    setLoading(true);
    setError("");

    try {
      // Just take a sample to keep things light
      const res = await axios.get(
        "https://jsonplaceholder.typicode.com/comments",
        {
          params: { _limit: 80 },
        }
      );

      const data = res.data || [];
      setComments(data);

      const total = data.length;
      const avgLength =
        total > 0
          ? data.reduce((sum, c) => sum + (c.body?.length || 0), 0) / total
          : 0;

      const postIds = new Set(data.map((c) => c.postId));
      setStats({
        total,
        avgLength: Math.round(avgLength),
        postsInSample: postIds.size,
      });
    } catch (err) {
      console.error("[SocialPage] error:", err);
      setError("Failed to load social / community data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="df-card df-detail">
      <div className="df-detail-header">
        <h2>Social & Community Heat • Conversation Stream</h2>
        <p>
          Simulated developer chatter using JSONPlaceholder comments –
          approximating thread depth and engagement.
        </p>
        {error && <p className="df-error">{error}</p>}
      </div>

      <div className="df-detail-grid">
        {/* Left: stats */}
        <div>
          <MetricRow label="Comments sampled" value={stats.total} />
          <MetricRow
            label="Unique threads (postIds)"
            value={stats.postsInSample}
          />
          <MetricRow
            label="Average comment length"
            value={`${stats.avgLength} chars`}
          />

          <p className="df-panel-note">
            In a real system this block would be backed by Discord / Slack /
            GitHub discussions or issue trackers; here we use JSONPlaceholder as
            a safe mock.
          </p>

          <button
            className="df-refresh"
            onClick={fetchSocialDetails}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh social data"}
          </button>
        </div>

        {/* Right: recent comments */}
        <div className="df-sublist">
          <div className="df-sublist-title">Recent Sample Comments</div>
          <ul style={{ maxHeight: 320, overflowY: "auto" }}>
            {comments.map((c) => (
              <li key={c.id}>
                <span className="mono">
                  #{c.postId} – {c.name.slice(0, 40)}
                  {c.name.length > 40 ? "…" : ""}
                </span>
                <span className="df-subtext">
                  {c.email} · {c.body.slice(0, 80)}
                  {c.body.length > 80 ? "…" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="df-metric">
      <span className="df-metric-label">{label}</span>
      <span className="df-metric-value">{value ?? "-"}</span>
    </div>
  );
}

export default SocialPage;
