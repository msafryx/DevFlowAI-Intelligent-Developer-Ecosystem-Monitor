// src/pages/InfraPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Tech-hub data centers we want to monitor
const HUBS = [
  { id: "newyork", label: "New York, US", q: "New York,US" },
  { id: "berlin", label: "Berlin, DE", q: "Berlin,DE" },
  { id: "bangalore", label: "Bengaluru, IN", q: "Bangalore,IN" },
];

function InfraPage() {
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInfraDetails();
  }, []);

  async function fetchInfraDetails() {
    setLoading(true);
    setError("");

    try {
      // Regions: US, DE, IN
      const [countriesRes, hubsRes] = await Promise.all([
        axios.get("https://restcountries.com/v3.1/alpha?codes=us,de,in"),
        fetchHubsWeather(),
      ]);

      setCountries(countriesRes.data || []);
      setHubs(hubsRes);
    } catch (err) {
      console.error("[InfraPage] error:", err);
      setError("Failed to load infra / weather data.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchHubsWeather() {
    if (!OPENWEATHER_API_KEY) {
      console.warn("[InfraPage] Missing VITE_OPENWEATHER_API_KEY");
      return HUBS.map((h) => ({
        ...h,
        temp: 25,
        humidity: 50,
        condition: "Unknown",
      }));
    }

    const results = await Promise.all(
      HUBS.map(async (hub) => {
        try {
          const res = await axios.get(
            "https://api.openweathermap.org/data/2.5/weather",
            {
              params: {
                q: hub.q,
                appid: OPENWEATHER_API_KEY,
                units: "metric",
              },
            }
          );

          const main = res.data.main || {};
          const cond = res.data.weather?.[0]?.main || "Clear";

          return {
            ...hub,
            temp: main.temp ?? 25,
            humidity: main.humidity ?? 50,
            condition: cond,
          };
        } catch (err) {
          console.error("[InfraPage hub] error:", err);
          return {
            ...hub,
            temp: 25,
            humidity: 50,
            condition: "Unknown",
          };
        }
      })
    );

    return results;
  }

  const avgLatencyIndex = countries.length
    ? countries.reduce((sum, c) => sum + (c.area || 0), 0) /
      (countries.length * 10_000_000)
    : 0.5;

  return (
    <section className="df-card df-detail">
      <div className="df-detail-header">
        <h2>Infra & Weather • Data Center Lens</h2>
        <p>
          Regional connectivity (US, DE, IN) and live weather from key tech
          hubs like New York, Berlin, and Bengaluru.
        </p>
        {error && <p className="df-error">{error}</p>}
      </div>

      <div className="df-detail-grid">
        {/* Left: region stats */}
        <div>
          <MetricRow
            label="Regions tracked"
            value={countries.length}
          />
          <MetricRow
            label="Approx. latency index"
            value={avgLatencyIndex.toFixed(2)}
          />
          <p className="df-panel-note">
            Latency index is a rough proxy here based on country area; in a real
            system you would plug in real latency telemetry.
          </p>

          <div className="df-sublist" style={{ marginTop: 16 }}>
            <div className="df-sublist-title">Regions</div>
            <ul>
              {countries.map((c) => (
                <li key={c.cca2}>
                  <span>{c.name?.common}</span>
                  <span className="df-subtext">
                    Pop. {c.population?.toLocaleString()} ·{" "}
                    {c.region || "N/A"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            className="df-refresh"
            onClick={fetchInfraDetails}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh infra data"}
          </button>
        </div>

        {/* Right: hub weather */}
        <div className="df-sublist">
          <div className="df-sublist-title">Data Center Weather</div>
          <ul>
            {hubs.map((h) => (
              <li key={h.id}>
                <span>{h.label}</span>
                <span className="df-subtext">
                  {h.condition} · {h.temp.toFixed(1)}°C · Humidity{" "}
                  {h.humidity}%
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

export default InfraPage;
