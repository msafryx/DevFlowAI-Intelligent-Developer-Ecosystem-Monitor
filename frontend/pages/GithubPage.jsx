// src/pages/GithubPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

function GithubPage() {
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState([]);
  const [languageStats, setLanguageStats] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGithubDetails();
  }, []);

  async function fetchGithubDetails() {
    setLoading(true);
    setError("");

    try {
      // Top machine-learning repos as a proxy for dev ecosystem
      const res = await axios.get(
        "https://api.github.com/search/repositories?q=topic:machine-learning&sort=stars&order=desc&per_page=30",
        {
          headers: GITHUB_TOKEN
            ? { Authorization: `Bearer ${GITHUB_TOKEN}` }
            : {},
        }
      );

      const items = res.data.items || [];
      setRepos(items);

      // Simple language distribution from repo.language
      const counts = {};
      items.forEach((r) => {
        const lang = r.language || "Other";
        counts[lang] = (counts[lang] || 0) + 1;
      });

      const langArr = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setLanguageStats(langArr);
    } catch (err) {
      console.error("[GithubPage] error:", err);
      setError("Failed to load GitHub activity.");
    } finally {
      setLoading(false);
    }
  }

  const totalRepos = repos.length;
  const totalStars = repos.reduce(
    (sum, r) => sum + (r.stargazers_count || 0),
    0
  );
  const avgStars = totalRepos ? Math.round(totalStars / totalRepos) : 0;

  return (
    <section className="df-card df-detail">
      <div className="df-detail-header">
        <h2>GitHub Activity • Deep View</h2>
        <p>
          Live snapshot of top machine-learning repositories – stars, forks and
          language distribution.
        </p>
        {error && <p className="df-error">{error}</p>}
      </div>

      <div className="df-detail-grid">
        {/* Left: summary & languages */}
        <div>
          <MetricRow label="Repositories scanned" value={totalRepos} />
          <MetricRow label="Total stars" value={totalStars} />
          <MetricRow label="Average stars / repo" value={avgStars} />
          <MetricRow
            label="Top repo (by stars)"
            value={
              repos[0]
                ? `${repos[0].owner.login}/${repos[0].name}`
                : "Not available"
            }
            mono
          />

          <div className="df-sublist" style={{ marginTop: 16 }}>
            <div className="df-sublist-title">Top Languages</div>
            <ul>
              {languageStats.map((l) => (
                <li key={l.name}>
                  <span>{l.name}</span>
                  <span className="df-subtext">
                    {l.count} repo{l.count > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            className="df-refresh"
            onClick={fetchGithubDetails}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh GitHub data"}
          </button>
        </div>

        {/* Right: repo list */}
        <div className="df-sublist">
          <div className="df-sublist-title">Top Repositories</div>
          <ul style={{ maxHeight: 320, overflowY: "auto" }}>
            {repos.map((r) => (
              <li key={r.id}>
                <span>
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="df-link mono"
                  >
                    {r.owner.login}/{r.name}
                  </a>
                </span>
                <span className="df-subtext">
                  ★ {r.stargazers_count} · Forks {r.forks_count} ·{" "}
                  {r.language || "Other"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value, mono }) {
  return (
    <div className="df-metric">
      <span className="df-metric-label">{label}</span>
      <span className={`df-metric-value ${mono ? "mono" : ""}`}>
        {value ?? "-"}
      </span>
    </div>
  );
}

export default GithubPage;
