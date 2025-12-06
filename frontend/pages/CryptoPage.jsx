// src/pages/CryptoPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const COIN_IDS =
  "bitcoin,ethereum,solana,cardano,polkadot,chainlink,arbitrum,optimism";

function CryptoPage() {
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCryptoDetails();
  }, []);

  async function fetchCryptoDetails() {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets`,
        {
          params: {
            vs_currency: "usd",
            ids: COIN_IDS,
            order: "market_cap_desc",
            sparkline: false,
            price_change_percentage: "1h,24h,7d",
          },
        }
      );

      setCoins(res.data || []);
    } catch (err) {
      console.error("[CryptoPage] error:", err);
      setError("Failed to load crypto / Web3 data.");
    } finally {
      setLoading(false);
    }
  }

  const totalMCap = coins.reduce(
    (sum, c) => sum + (c.market_cap || 0),
    0
  );
  const avg24 = coins.length
    ? coins.reduce(
        (sum, c) => sum + (c.price_change_percentage_24h || 0),
        0
      ) / coins.length
    : 0;

  let marketHealth = "Sideways";
  if (avg24 > 3) marketHealth = "Strong Uptrend";
  else if (avg24 > 0.5) marketHealth = "Mild Uptrend";
  else if (avg24 < -3) marketHealth = "Sharp Sell-off";
  else if (avg24 < -0.5) marketHealth = "Mild Pullback";

  return (
    <section className="df-card df-detail">
      <div className="df-detail-header">
        <h2>Crypto & Web3 • Market Monitor</h2>
        <p>
          Developer-relevant layer-1 / infra coins with price, market cap and
          short-term momentum.
        </p>
        {error && <p className="df-error">{error}</p>}
      </div>

      <div className="df-detail-grid">
        {/* Left: summary */}
        <div>
          <MetricRow
            label="Tracked assets"
            value={coins.length}
          />
          <MetricRow
            label="Total market cap (USD)"
            value={
              totalMCap
                ? `$${(totalMCap / 1_000_000_000).toFixed(1)}B`
                : "-"
            }
          />
          <MetricRow
            label="Average 24h change"
            value={`${avg24.toFixed(2)}%`}
          />
          <MetricRow label="Market health" value={marketHealth} />

          <p className="df-panel-note">
            Coins chosen to roughly represent chains and infra that developers
            commonly build on (BTC, ETH, SOL, ADA, DOT, LINK, ARB, OP).
          </p>

          <button
            className="df-refresh"
            onClick={fetchCryptoDetails}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh market data"}
          </button>
        </div>

        {/* Right: coin table */}
        <div className="df-sublist">
          <div className="df-sublist-title">Tracked Assets</div>
          <ul style={{ maxHeight: 320, overflowY: "auto" }}>
            {coins.map((c) => (
              <li key={c.id}>
                <span>
                  {c.name}{" "}
                  <span className="df-subtext">({c.symbol.toUpperCase()})</span>
                </span>
                <span className="df-subtext">
                  ${c.current_price.toFixed(2)} · 24h{" "}
                  {c.price_change_percentage_24h?.toFixed(2)}% · 7d{" "}
                  {c.price_change_percentage_7d_in_currency?.toFixed(2)}%
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

export default CryptoPage;
