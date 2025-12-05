import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5000";

const mockSummary = {
  score: 72,
  githubStats: {
    totalRepos: 1284,
    totalStars: 93420,
    topLanguage: "JavaScript",
    trendingRepo: "openai/devflow-ai",
  },
  cryptoStats: {
    dominantCoin: "BTC",
    dominantChange24h: 2.34,
    marketHealth: "Bullish",
  },
  newsSentiment: {
    sentimentScore: 0.32,
    label: "Moderately Positive",
    topHeadline:
      "AI-powered developer tools gain adoption as ecosystem shifts to automation.",
  },
  infraStats: {
    topRegion: "North America",
    latencyIndex: 0.82,
    cloudCoverage: "High",
  },
  weatherStats: {
    dataCenterRegion: "us-east-1",
    status: "Stable",
    tempC: 23,
  },
  socialStats: {
    simulatedPosts: 4521,
    engagementIndex: 0.69,
  },
};

const mockHistory = [
  { t: "09:00", score: 64 },
  { t: "10:00", score: 67 },
  { t: "11:00", score: 70 },
  { t: "12:00", score: 71 },
  { t: "13:00", score: 72 },
];

const STREAMS = {
  global: {
    label: "Global Intelligence",
    description: "Composite ecosystem overview.",
  },
  github: {
    label: "GitHub Activity",
    description: "Repositories, stars, languages & trends.",
  },
  crypto: {
    label: "Crypto & Web3",
    description: "Token health & funding signals.",
  },
  news: {
    label: "Tech News Sentiment",
    description: "Headlines & sentiment shifts.",
  },
  infra: {
    label: "Infra & Weather",
    description: "Regions, latency & climate impact.",
  },
  social: {
    label: "Social Signals",
    description: "Community heat & engagement.",
  },
};

function App() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState("global"); // 👈 NEW: which sidebar item is active

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [summaryRes, historyRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/devflow/summary`),
          axios.get(`${API_BASE_URL}/api/devflow/history`),
        ]);

        if (summaryRes.status === "fulfilled") {
          setSummary(summaryRes.value.data);
        } else {
          console.warn("Using mock summary data", summaryRes.reason);
          setSummary(mockSummary);
        }

        if (historyRes.status === "fulfilled") {
          setHistory(historyRes.value.data);
        } else {
          console.warn("Using mock history data", historyRes.reason);
          setHistory(mockHistory);
        }
      } catch (err) {
        console.error("Error fetching DevFlow data:", err);
        setSummary(mockSummary);
        setHistory(mockHistory);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const score = summary?.score ?? 0;
  const scoreLabel =
    score >= 80
      ? "Ecosystem Thriving"
      : score >= 60
      ? "Healthy"
      : score >= 40
      ? "Watch Closely"
      : "Critical";

  const activeStreamMeta = STREAMS[stream];

  return (
    <div className="df-root">
      <div className="df-scanlines" />

      {/* Sidebar */}
      <aside className="df-sidebar">
        <div className="df-logo">
          <div className="df-logo-orb" />
          <div className="df-logo-text">
            <span className="df-logo-main">DevFlow</span>
            <span className="df-logo-sub">AI Matrix Console</span>
          </div>
        </div>

        <nav className="df-nav">
          <span className="df-nav-section">Streams</span>

          <button
            className={`df-nav-item ${stream === "global" ? "active" : ""}`}
            onClick={() => setStream("global")}
          >
            Global Intelligence
          </button>
          <button
            className={`df-nav-item ${stream === "github" ? "active" : ""}`}
            onClick={() => setStream("github")}
          >
            GitHub Activity
          </button>
          <button
            className={`df-nav-item ${stream === "crypto" ? "active" : ""}`}
            onClick={() => setStream("crypto")}
          >
            Crypto & Web3
          </button>
          <button
            className={`df-nav-item ${stream === "news" ? "active" : ""}`}
            onClick={() => setStream("news")}
          >
            Tech News Sentiment
          </button>
          <button
            className={`df-nav-item ${stream === "infra" ? "active" : ""}`}
            onClick={() => setStream("infra")}
          >
            Infra & Weather
          </button>
          <button
            className={`df-nav-item ${stream === "social" ? "active" : ""}`}
            onClick={() => setStream("social")}
          >
            Social Signals
          </button>

          <span className="df-nav-section mt">APIs Online</span>
          <ul className="df-api-list">
            <li>● GitHub API</li>
            <li>● CoinGecko API</li>
            <li>● News API</li>
            <li>● REST Countries</li>
            <li>● OpenWeatherMap</li>
            <li>● JSONPlaceholder</li>
          </ul>
        </nav>

        <div className="df-sidebar-footer">
          <span className="df-pill df-pill-online">LIVE • SYNCED</span>
          <span className="df-build">build: v0.1-alpha</span>
        </div>
      </aside>

      {/* Main */}
      <main className="df-main">
        <div className="df-main-inner">
          <div className="main-title">
              <h1>Global Developer Ecosystem Monitor</h1>
          </div>
          {/* Top bar */}
          <header className="df-header">

            <div>
              <p>
                Real-time AI-powered telemetry across code, crypto, cloud,
                climate & community.
              </p>
              <div className="df-header-stream">
                <span className="df-header-pill">
                  VIEW • {activeStreamMeta.label.toUpperCase()}
                </span>
                <span className="df-header-stream-desc">
                  {activeStreamMeta.description}
                </span>
              </div>
            </div>

            <div className="df-header-right">
              <div className="df-badge">INTEL FEED</div>
              <div className="df-clock">
                {new Date().toLocaleString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </header>

          {/* Score + trend row */}
          <section className="df-row">
            <ScoreCard score={score} label={scoreLabel} loading={loading} />
            <HistoryCard history={history} />
          </section>

          {/* Metric grid */}
          <section className="df-grid">
            <Panel
              title="GitHub Pulse"
              accent="green"
              active={stream === "github" || stream === "global"}
            >
              <Metric
                label="Total Repos"
                value={summary?.githubStats?.totalRepos}
              />
              <Metric
                label="Total Stars"
                value={summary?.githubStats?.totalStars}
              />
              <Metric
                label="Top Language"
                value={summary?.githubStats?.topLanguage}
              />
              <Metric
                label="Trending Repo"
                value={summary?.githubStats?.trendingRepo}
                mono
              />
            </Panel>

            <Panel
              title="Crypto & Web3 Signal"
              accent="purple"
              active={stream === "crypto" || stream === "global"}
            >
              <Metric
                label="Dominant Asset"
                value={summary?.cryptoStats?.dominantCoin}
              />
              <Metric
                label="24h Change"
                value={
                  summary?.cryptoStats
                    ? `${summary.cryptoStats.dominantChange24h.toFixed(2)}%`
                    : "-"
                }
              />
              <Metric
                label="Market Health"
                value={summary?.cryptoStats?.marketHealth}
              />
            </Panel>

            <Panel
              title="Tech News Sentiment"
              accent="cyan"
              active={stream === "news" || stream === "global"}
            >
              <Metric
                label="Sentiment Score"
                value={summary?.newsSentiment?.sentimentScore?.toFixed(2)}
              />
              <Metric label="Sentiment" value={summary?.newsSentiment?.label} />
              <div className="df-headline">
                {summary?.newsSentiment?.topHeadline}
              </div>
            </Panel>

            <Panel
              title="Infra & Weather Watch"
              accent="amber"
              active={stream === "infra" || stream === "global"}
            >
              <Metric
                label="Top Region"
                value={summary?.infraStats?.topRegion}
              />
              <Metric
                label="Latency Index"
                value={summary?.infraStats?.latencyIndex}
              />
              <Metric
                label="Cloud Coverage"
                value={summary?.infraStats?.cloudCoverage}
              />
              <Metric
                label="DC Weather"
                value={
                  summary?.weatherStats
                    ? `${summary.weatherStats.status} · ${summary.weatherStats.tempC}°C`
                    : "-"
                }
              />
            </Panel>

            <Panel
              title="Social & Community Heat"
              accent="pink"
              active={stream === "social" || stream === "global"}
            >
              <Metric
                label="Simulated Posts"
                value={summary?.socialStats?.simulatedPosts}
              />
              <Metric
                label="Engagement Index"
                value={summary?.socialStats?.engagementIndex}
              />
              <p className="df-panel-note">
                Data via JSONPlaceholder – modelling developer community
                chatter.
              </p>
            </Panel>

            <Panel
              title="AI Engine Status"
              accent="lime"
              active={stream === "global"}
            >
              <ul className="df-status-list">
                <li>✓ Stream aggregator online</li>
                <li>✓ Sentiment engine active</li>
                <li>✓ Scoring model v1.0 loaded</li>
                <li>△ Prediction module in beta</li>
              </ul>
            </Panel>
          </section>
        </div>
      </main>
    </div>
  );
}

function ScoreCard({ score, label, loading }) {
  const normalized = Math.min(Math.max(score, 0), 100);
  const angle = (normalized / 100) * 270 - 135;

  return (
    <div className="df-card df-score-card">
      <div className="df-card-header">
        <span className="df-card-title">AI Intelligence Score</span>
        <span className="df-chip">0 – 100</span>
      </div>
      <div className="df-score-body">
        <div className="df-gauge">
          <div className="df-gauge-arc" />
          <div
            className="df-gauge-needle"
            style={{ transform: `rotate(${angle}deg)` }}
          />
          <div className="df-gauge-center">{loading ? ".." : normalized}</div>
        </div>
        <div className="df-score-meta">
          <span className="df-score-label">{label}</span>
          <p>
            Composite signal derived from GitHub activity, crypto markets, news
            sentiment, global infra & climate telemetry.
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ history }) {
  return (
    <div className="df-card df-history-card">
      <div className="df-card-header">
        <span className="df-card-title">Ecosystem Trend</span>
        <span className="df-chip">last window</span>
      </div>
      <div className="df-history-body">
        <Sparkline data={history} />
        <ul className="df-history-legend">
          {history.map((p) => (
            <li key={p.t}>
              <span>{p.t}</span>
              <span>{p.score}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.score));
  const min = Math.min(...data.map((d) => d.score));
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - ((d.score - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="df-sparkline"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        vectorEffect="non-scaling-stroke"
        className="df-sparkline-line"
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * 100;
        const y = 100 - ((d.score - min) / range) * 100;
        return (
          <circle key={i} cx={x} cy={y} r="1.6" className="df-sparkline-dot" />
        );
      })}
    </svg>
  );
}

function Panel({ title, accent, children, active }) {
  return (
    <section
      className={`df-card df-panel df-panel-${accent} ${
        active ? "df-panel-active" : ""
      }`}
    >
      <div className="df-card-header">
        <span className="df-card-title">{title}</span>
      </div>
      <div className="df-panel-body">{children}</div>
    </section>
  );
}

function Metric({ label, value, mono }) {
  return (
    <div className="df-metric">
      <span className="df-metric-label">{label}</span>
      <span className={`df-metric-value ${mono ? "mono" : ""}`}>
        {value ?? "-"}
      </span>
    </div>
  );
}

export default App;
