// src/pages/NewsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;

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

export default function NewsPage() {
  const [loading, setLoading] = useState(true);
  const [topNews, setTopNews] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [sentiment, setSentiment] = useState({
    sentimentScore: 0,
    label: "Neutral",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    if (!NEWS_API_KEY) {
      setError("VITE_NEWS_API_KEY is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.get(
        `https://newsapi.org/v2/everything?q=software+development+OR+programming+OR+AI&sortBy=publishedAt&pageSize=30&language=en&apiKey=${NEWS_API_KEY}`
      );

      const articles = res.data.articles || [];

      const texts = articles.map(
        (a) => `${a.title || ""} ${a.description || ""}`
      );
      const sentimentResult = analyzeSentiment(texts);
      setSentiment(sentimentResult);

      setTopNews(articles.slice(0, 5)); // Top news
      setRecentNews(articles.slice(5, 20)); // Recent list
    } catch (err) {
      console.error("[NewsPage] Error:", err);
      setError("Failed to load tech news.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="df-card df-detail">
      <div className="df-detail-header">
        <h2>Tech News Sentiment • Detailed Feed</h2>
        <p>
          Live AI / developer tooling headlines, split into Top stories and
          Recent stream.
        </p>
        {error && <p className="df-error">{error}</p>}
      </div>

      <div className="df-detail-grid">
        {/* Left: sentiment summary */}
        <div>
          <div className="df-metric">
            <span className="df-metric-label">Sentiment Score</span>
            <span className="df-metric-value">
              {sentiment.sentimentScore.toFixed(3)}
            </span>
          </div>
          <div className="df-metric">
            <span className="df-metric-label">Overall Sentiment</span>
            <span className="df-metric-value">{sentiment.label}</span>
          </div>
          <p className="df-panel-note">
            The sentiment score is calculated from NewsAPI headlines using a
            simple keyword-based model and normalized to the range -1 to 1.
          </p>
          <button className="df-refresh" onClick={fetchNews} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh feed"}
          </button>
        </div>

        {/* Right: lists */}
        <div className="df-news-columns">
          <div className="df-sublist">
            <div className="df-sublist-title">Top News</div>
            <ul>
              {topNews.map((a) => (
                <li key={a.url}>
                  <span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="df-link"
                    >
                      {a.title}
                    </a>
                  </span>
                  <span className="df-subtext">
                    {a.source?.name} ·{" "}
                    {new Date(a.publishedAt).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="df-sublist">
            <div className="df-sublist-title">Recent Stream</div>
            <ul className="df-news-recent">
              {recentNews.map((a) => (
                <li key={a.url}>
                  <span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="df-link"
                    >
                      {a.title}
                    </a>
                  </span>
                  <span className="df-subtext">
                    {a.source?.name} ·{" "}
                    {new Date(a.publishedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
