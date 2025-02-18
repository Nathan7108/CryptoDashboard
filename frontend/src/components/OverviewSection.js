// src/components/OverviewSection.js
import React from "react";
import "../css/OverviewSection.css";

const OverviewSection = () => {
  // Placeholder data for demonstration
  const marketCap = 1234567890;
  const marketCapChange = -1.27; // negative indicates a decrease
  const volume24h = 987654321;
  const btcDominance = 42.5;
  const fearGreedIndex = 51;

  const trendingCoins = [
    { name: "Bitcoin", price: 23000, change: 2.1, id: "bitcoin" },
    { name: "Ethereum", price: 1600, change: -1.2, id: "ethereum" },
    { name: "BNB", price: 300, change: 0.5, id: "binance-coin" },
  ];

  return (
    <section className="overview">
      <h2>Today’s Cryptocurrency Prices by Market Cap</h2>
      <p>
        The global crypto market cap is $
        {marketCap.toLocaleString()}
        , a {Math.abs(marketCapChange)}%{" "}
        {marketCapChange > 0 ? "increase" : "decrease"} over the last day.
      </p>

      <div className="overview__cards-container">
        {/* Trending Coins Card */}
        <div className="overview__card overview__trending">
          <h3>Trending Coins</h3>
          <ul>
            {trendingCoins.map((coin) => (
              <li key={coin.id}>
                {coin.name} – ${coin.price.toLocaleString()}{" "}
                <span style={{ color: coin.change >= 0 ? "green" : "red" }}>
                  ({coin.change}%)
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Market Stats Card */}
        <div className="overview__card overview__stats">
          <h3>Market Stats</h3>
          <div className="stats-row">
            <div className="stat">
              <span>24h Volume</span>
              <strong>${volume24h.toLocaleString()}</strong>
            </div>
            <div className="stat">
              <span>BTC Dominance</span>
              <strong>{btcDominance}%</strong>
            </div>
            <div className="stat">
              <span>Fear & Greed</span>
              <strong>{fearGreedIndex}</strong>
            </div>
          </div>
        </div>

        {/* Promo / Ad Card */}
        <div className="overview__card overview__promo">
          <h3>Sponsored</h3>
          <div className="promo-content">
            <img
              src="https://via.placeholder.com/150"
              alt="Promotional"
            />
            <p>Check out our new product or service!</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;
