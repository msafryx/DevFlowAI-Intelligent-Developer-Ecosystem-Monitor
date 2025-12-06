import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import NewsPage from "../pages/NewsPage";
import GithubPage from "../pages/GithubPage";
import CryptoPage from "../pages/CryptoPage";
import InfraPage from "../pages/InfraPage";
import SocialPage from "../pages/SocialPage";

/* ========= ENV KEYS (from Vite .env) ========= */

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

const OPENWEATHER_CITY = import.meta.env.VITE_OPENWEATHER_CITY || "London";
const OPENWEATHER_COUNTRY = import.meta.env.VITE_OPENWEATHER_COUNTRY || "GB";

/* ========= Simple sentiment util ========= */

const positiveWords = [
  "growth",
  "positive",
  "gain",
  "improve",
  "success",
  "record",
  "innovation",
  "bullish",
  "strong",
  "up",
  "surge",
  "rally",
];

const negativeWords = [
  "down",
  "drop",
  "crash",
  "fail",
  "bug",
  "issue",
  "problem",
  "bearish",
  "weak",
  "cut",
  "loss",
  "decline",
];

function analyzeSentiment(texts = []) {
  let score = 0;
  let totalWords = 0;

  texts.forEach((t) => {
    if (!t) return;
    const words = t.toLowerCase().split(/\W+/);
    totalWords += words.length;
    words.forEach((w) => {
      if (positiveWords.includes(w)) score += 1;
      if (negativeWords.includes(w)) score -= 1;
    });
  });

  const normalized = totalWords ? score / totalWords : 0;

  let label = "Neutral";
  if (normalized > 0.02) label = "Moderately Positive";
  if (normalized > 0.05) label = "Strongly Positive";
  if (normalized < -0.02) label = "Moderately Negative";
  if (normalized < -0.05) label = "Strongly Negative";

  return {
    sentimentScore: Number(normalized.toFixed(3)),
    label,
  };
}

/* ========= Score utils ========= */

function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

function scaleTo100(value, min, max) {
  if (max === min) return 50;
  const norm = (value - min) / (max - min);
  return clamp(Math.round(norm * 100), 0, 100);
}

function computeScore({
  githubStats,
  cryptoStats,
  newsSentiment,
  infraStats,
  weatherStats,
  socialStats,
}) {
  const repoScore = scaleTo100(githubStats.totalRepos || 0, 100, 5000);
  const starScore = scaleTo100(githubStats.totalStars || 0, 1000, 200000);
  const githubScore = Math.round(0.4 * repoScore + 0.6 * starScore);

  const change = cryptoStats.dominantChange24h ?? 0;
  const cryptoScore = clamp(Math.round(50 + (change / 10) * 50), 0, 100);

  const newsScore = clamp(
    Math.round((newsSentiment.sentimentScore + 1) * 50),
    0,
    100
  );

  const latencyScore = scaleTo100(1 - (infraStats.latencyIndex ?? 0.5), 0, 1);
  const coverageScore = infraStats.cloudCoverage === "High" ? 90 : 60;
  const infraScore = Math.round(0.6 * latencyScore + 0.4 * coverageScore);

  const temp = weatherStats.tempC ?? 25;
  const stable = weatherStats.status === "Stable" ? 80 : 50;
  const tempPenalty = temp < 0 || temp > 35 ? 20 : 0;
  const weatherScore = clamp(stable - tempPenalty, 0, 100);

  const engagement = socialStats.engagementIndex ?? 0.5;
  const socialScore = scaleTo100(engagement, 0, 1);

  const finalScore =
    0.3 * githubScore +
    0.2 * cryptoScore +
    0.2 * newsScore +
    0.15 * infraScore +
    0.05 * weatherScore +
    0.1 * socialScore;

  return Math.round(finalScore);
}

/* ========= External API calls (frontend) ========= */

async function fetchGithubStats() {
  try {
    const res = await axios.get(
      "https://api.github.com/search/repositories?q=topic:machine-learning&sort=stars&order=desc&per_page=10",
      {
        headers: GITHUB_TOKEN
          ? { Authorization: `Bearer ${GITHUB_TOKEN}` }
          : {},
      }
    );

    const items = res.data.items || [];
    const totalRepos = items.length;
    const totalStars = items.reduce(
      (sum, repo) => sum + (repo.stargazers_count || 0),
      0
    );
    const topRepo = items[0];

    const topRepos = items.slice(0, 3).map((repo) => ({
      name: `${repo.owner.login}/${repo.name}`,
      stars: repo.stargazers_count,
      language: repo.language,
      url: repo.html_url,
    }));

    return {
      totalRepos,
      totalStars,
      topLanguage: topRepo?.language || "Unknown",
      trendingRepo: topRepo ? `${topRepo.owner.login}/${topRepo.name}` : "N/A",
      topRepos,
    };
  } catch (err) {
    console.error("[GitHub] Error:", err.message);
    return {
      totalRepos: 0,
      totalStars: 0,
      topLanguage: "Unknown",
      trendingRepo: "N/A",
      topRepos: [],
    };
  }
}

async function fetchCryptoStats() {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
    );

    const btc = res.data.bitcoin || {};
    const eth = res.data.ethereum || {};

    const dominant =
      (btc.usd_24h_change ?? 0) >= (eth.usd_24h_change ?? 0) ? "BTC" : "ETH";
    const dominantObj = dominant === "BTC" ? btc : eth;

    const change = dominantObj.usd_24h_change ?? 0;

    let trendLabel = "Sideways";
    if (change > 3) trendLabel = "Strong Uptrend";
    else if (change > 0.5) trendLabel = "Mild Uptrend";
    else if (change < -3) trendLabel = "Sharp Sell-off";
    else if (change < -0.5) trendLabel = "Mild Pullback";

    return {
      dominantCoin: dominant,
      dominantPrice: dominantObj.usd ?? null,
      dominantChange24h: change,
      marketHealth: change >= 0 ? "Bullish" : "Bearish",
      btc: {
        price: btc.usd ?? null,
        change24h: btc.usd_24h_change ?? 0,
      },
      eth: {
        price: eth.usd ?? null,
        change24h: eth.usd_24h_change ?? 0,
      },
      trendLabel,
    };
  } catch (err) {
    console.error("[CoinGecko] Error:", err.message);
    return {
      dominantCoin: "BTC",
      dominantPrice: null,
      dominantChange24h: 0,
      marketHealth: "Unknown",
      btc: null,
      eth: null,
      trendLabel: "Unknown",
    };
  }
}

async function fetchNewsSentiment() {
  if (!NEWS_API_KEY) {
    console.warn("[NewsAPI] Missing VITE_NEWS_API_KEY");
    return {
      sentimentScore: 0,
      label: "Neutral",
      topHeadline: "News API key not configured.",
      topHeadlines: [],
    };
  }

  try {
    const res = await axios.get(
      `https://newsapi.org/v2/everything?q=software+development+OR+programming+OR+AI&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWS_API_KEY}`
    );

    const articles = res.data.articles || [];
    const texts = articles.map(
      (a) => `${a.title || ""} ${a.description || ""}`
    );
    const sentiment = analyzeSentiment(texts);

    const topHeadlines = articles.slice(0, 3).map((a) => ({
      title: a.title,
      source: a.source?.name,
      url: a.url,
    }));

    return {
      ...sentiment,
      topHeadline: articles[0]?.title || "No recent headlines retrieved.",
      topHeadlines,
    };
  } catch (err) {
    console.error("[NewsAPI] Error:", err.message);
    return {
      sentimentScore: 0,
      label: "Neutral",
      topHeadline: "Error fetching tech news sentiment.",
      topHeadlines: [],
    };
  }
}

async function fetchInfraStats() {
  try {
    const res = await axios.get(
      "https://restcountries.com/v3.1/alpha?codes=us,de,in"
    );
    const countries = res.data || [];

    const latencyIndex = countries.length
      ? countries.reduce((sum, c) => sum + (c.area || 0), 0) /
        (countries.length * 10_000_000)
      : 0.5;

    const regions = countries.map((c) => ({
      code: c.cca2,
      name: c.name?.common,
      population: c.population,
    }));

    return {
      topRegion: "North America",
      latencyIndex: Number(latencyIndex.toFixed(2)),
      cloudCoverage: "High",
      sampleRegions: regions,
    };
  } catch (err) {
    console.error("[REST Countries] Error:", err.message);
    return {
      topRegion: "Global",
      latencyIndex: 0.5,
      cloudCoverage: "Unknown",
      sampleRegions: [],
    };
  }
}

async function fetchWeatherStats() {
  if (!OPENWEATHER_API_KEY) {
    console.warn("[OpenWeather] Missing VITE_OPENWEATHER_API_KEY");
    return {
      dataCenterRegion: `${OPENWEATHER_CITY}, ${OPENWEATHER_COUNTRY}`,
      status: "Unknown",
      tempC: 25,
      humidity: 50,
      condition: "Clear",
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${OPENWEATHER_CITY},${OPENWEATHER_COUNTRY}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await axios.get(url);

    const main = res.data.main || {};
    const weatherMain = res.data.weather?.[0]?.main || "Stable";

    return {
      dataCenterRegion: `${OPENWEATHER_CITY}, ${OPENWEATHER_COUNTRY}`,
      status:
        weatherMain === "Thunderstorm" || weatherMain === "Extreme"
          ? "Unstable"
          : "Stable",
      tempC: main.temp ?? 25,
      humidity: main.humidity ?? 50,
      condition: weatherMain,
    };
  } catch (err) {
    console.error("[OpenWeather] Error:", err.message);
    return {
      dataCenterRegion: `${OPENWEATHER_CITY}, ${OPENWEATHER_COUNTRY}`,
      status: "Unknown",
      tempC: 25,
      humidity: 50,
      condition: "Unknown",
    };
  }
}

async function fetchSocialStats() {
  try {
    const res = await axios.get(
      "https://jsonplaceholder.typicode.com/comments"
    );
    const comments = res.data || [];
    const count = comments.length;
    const engagementIndex = Math.min(count / 5000, 1);

    const avgLength =
      count > 0
        ? comments.reduce((sum, c) => sum + (c.body?.length || 0), 0) / count
        : 0;

    return {
      simulatedPosts: count,
      engagementIndex: Number(engagementIndex.toFixed(2)),
      averageCommentLength: Math.round(avgLength),
    };
  } catch (err) {
    console.error("[JSONPlaceholder] Error:", err.message);
    return {
      simulatedPosts: 0,
      engagementIndex: 0.5,
      averageCommentLength: 0,
    };
  }
}

/* ========= Streams meta ========= */

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

/* ========= Main App ========= */

function App() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState("global");
  const [theme, setTheme] = useState("dark");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();

    const interval = setInterval(fetchAll, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");

    try {
      const [
        githubStats,
        cryptoStats,
        newsSentiment,
        infraStats,
        weatherStats,
        socialStats,
      ] = await Promise.all([
        fetchGithubStats(),
        fetchCryptoStats(),
        fetchNewsSentiment(),
        fetchInfraStats(),
        fetchWeatherStats(),
        fetchSocialStats(),
      ]);

      const score = computeScore({
        githubStats,
        cryptoStats,
        newsSentiment,
        infraStats,
        weatherStats,
        socialStats,
      });

      const snapshot = {
        score,
        githubStats,
        cryptoStats,
        newsSentiment,
        infraStats,
        weatherStats,
        socialStats,
      };

      setSummary(snapshot);

      const label = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setHistory((prev) => {
        const next = [...prev, { t: label, score }];
        return next.slice(-10);
      });
    } catch (err) {
      console.error("[DevFlow] fetchAll error:", err);
      setError("Some streams failed to load. Showing partial data.");
    } finally {
      setLoading(false);
    }
  }

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
    <div
      className={`df-root ${
        theme === "light" ? "df-theme-light" : "df-theme-dark"
      }`}
    >
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
          <span className="df-pill df-pill-online">LIVE • CLIENT-SIDE</span>
          <span className="df-build">build: v0.2-frontend-only</span>
        </div>
      </aside>

      {/* Main */}
      <main className="df-main">
        <div className="df-main-inner">
          <div className="main-title">
            <h1>Global Developer Ecosystem Monitor</h1>
            <button
              className="df-theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "☀ Light mode" : "🌑 Dark mode"}
            </button>
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
              {error && <p className="df-error">{error}</p>}
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

          {/* Detail vs overview */}
          {stream === "news" ? (
            <NewsPage />
          ) : stream === "github" ? (
            <GithubPage />
          ) : stream === "crypto" ? (
            <CryptoPage />
          ) : stream === "infra" ? (
            <InfraPage />
          ) : stream === "social" ? (
            <SocialPage />
          ) : (
            // Global overview grid (same as you already have)

            /* For all other streams, keep the existing overview grid. */
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
                {summary?.githubStats?.topRepos?.length > 0 && (
                  <div className="df-sublist">
                    <div className="df-sublist-title">Top Repos</div>
                    <ul>
                      {summary.githubStats.topRepos.map((r) => (
                        <li key={r.name}>
                          <span className="mono">{r.name}</span>
                          <span>
                            {r.stars}★ · {r.language || "N/A"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  label="Dominant Price (USD)"
                  value={
                    summary?.cryptoStats?.dominantPrice != null
                      ? summary.cryptoStats.dominantPrice.toFixed(0)
                      : "-"
                  }
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
                <Metric
                  label="Trend"
                  value={summary?.cryptoStats?.trendLabel}
                />

                {summary?.cryptoStats?.btc && (
                  <div className="df-sublist">
                    <div className="df-sublist-title">Key Pairs</div>
                    <ul>
                      <li>
                        <span className="mono">BTC</span>
                        <span>
                          {summary.cryptoStats.btc.price?.toFixed(0)} USD ·{" "}
                          {summary.cryptoStats.btc.change24h.toFixed(2)}%
                        </span>
                      </li>
                      <li>
                        <span className="mono">ETH</span>
                        <span>
                          {summary.cryptoStats.eth?.price?.toFixed(0)} USD ·{" "}
                          {summary.cryptoStats.eth?.change24h.toFixed(2)}%
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
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
                <Metric
                  label="Sentiment"
                  value={summary?.newsSentiment?.label}
                />
                <div className="df-headline">
                  {summary?.newsSentiment?.topHeadline}
                </div>
                {summary?.newsSentiment?.topHeadlines?.length > 0 && (
                  <div className="df-sublist">
                    <div className="df-sublist-title">Headlines</div>
                    <ul>
                      {summary.newsSentiment.topHeadlines.map((h) => (
                        <li key={h.title}>
                          <span>{h.title}</span>
                          <span className="df-subtext">{h.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                <Metric
                  label="Humidity"
                  value={
                    summary?.weatherStats?.humidity != null
                      ? `${summary.weatherStats.humidity}%`
                      : "-"
                  }
                />
                <Metric
                  label="Condition"
                  value={summary?.weatherStats?.condition}
                />

                {summary?.infraStats?.sampleRegions?.length > 0 && (
                  <div className="df-sublist">
                    <div className="df-sublist-title">Sample Regions</div>
                    <ul>
                      {summary.infraStats.sampleRegions.map((r) => (
                        <li key={r.code}>
                          <span>{r.name}</span>
                          <span className="df-subtext">
                            Pop. {r.population?.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                <Metric
                  label="Avg. Comment Length"
                  value={
                    summary?.socialStats?.averageCommentLength
                      ? `${summary.socialStats.averageCommentLength} chars`
                      : "-"
                  }
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
                  <li>✓ Client-side stream aggregator online</li>
                  <li>✓ Sentiment engine active</li>
                  <li>✓ Scoring model v1.0 loaded</li>
                  <li>△ Persistence disabled (no backend)</li>
                </ul>
              </Panel>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/* ========= Subcomponents ========= */

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
        <span className="df-chip">recent snapshots</span>
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
