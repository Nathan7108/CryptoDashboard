import React, { useEffect, useState } from "react";
import "../css/OverviewSection.css";
import { Sparklines, SparklinesLine } from "react-sparklines";
import axios from "axios";

const OverviewSection = () => {
  // State for global metrics
  const [globalMetrics, setGlobalMetrics] = useState(null);
  // State for historical data
  const [marketHistory, setMarketHistory] = useState([]);
  const [volumeHistory, setVolumeHistory] = useState([]);
  // State for trending and top gainers
  const [trendingCoins, setTrendingCoins] = useState([]);
  const [topGainers, setTopGainers] = useState([]);

  // Fetch market data
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/market")
      .then((res) => {
        const coins = res.data.data;
        // Calculate global metrics
        const globalMarketCap = coins.reduce(
          (acc, coin) => acc + parseFloat(coin.marketCapUsd),
          0
        );
        const globalVolume24h = coins.reduce(
          (acc, coin) => acc + parseFloat(coin.volumeUsd24Hr),
          0
        );
        setGlobalMetrics({
          marketCap: globalMarketCap,
          volume24h: globalVolume24h,
        });
        // Sort coins by 24hr change
        const sortedByChange = [...coins].sort(
          (a, b) =>
            parseFloat(b.changePercent24Hr) - parseFloat(a.changePercent24Hr)
        );
        setTrendingCoins(sortedByChange.slice(0, 3));
        setTopGainers(sortedByChange.slice(0, 3));
      })
      .catch((err) => console.error("Error fetching market data:", err));

    // Fetch historical market cap data
    axios
      .get("http://127.0.0.1:8000/api/globalMarketHistory")
      .then((res) => {
        setMarketHistory(res.data.data);
      })
      .catch((err) =>
        console.error("Error fetching global market history:", err)
      );

    // Fetch historical volume data
    axios
      .get("http://127.0.0.1:8000/api/globalVolumeHistory")
      .then((res) => {
        setVolumeHistory(res.data.data);
      })
      .catch((err) =>
        console.error("Error fetching global volume history:", err)
      );
  }, []);

  if (!globalMetrics) return <p>Loading global metrics...</p>;

  return (
    <section className="overview-container">
      <h2>Today’s Cryptocurrency Prices by Market Cap</h2>
      <p>
        The global crypto market cap is $
        {globalMetrics.marketCap.toLocaleString()}.
      </p>

      <div className="overview-content">
        {/* Left Column: Global Stats */}
        <div className="stats-container">
          {/* Market Cap Card */}
          <div className="stat-card">
            <div className="stat-info">
              <h3>${globalMetrics.marketCap.toLocaleString()}</h3>
              <p>Market Cap</p>
            </div>
            <div className="sparkline">
              {marketHistory.length > 0 && (
                <Sparklines data={marketHistory} width={100} height={30}>
                  <SparklinesLine color="red" />
                </Sparklines>
              )}
            </div>
          </div>
          {/* 24h Trading Volume Card */}
          <div className="stat-card">
            <div className="stat-info">
              <h3>${globalMetrics.volume24h.toLocaleString()}</h3>
              <p>24h Trading Volume</p>
            </div>
            <div className="sparkline">
              {volumeHistory.length > 0 && (
                <Sparklines data={volumeHistory} width={100} height={30}>
                  <SparklinesLine color="green" />
                </Sparklines>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Trending and Top Gainers */}
        <div className="lists-container">
          {/* Trending Coins */}
          <div className="list-card">
            <div className="list-card-header">
              <h3>Trending</h3>
              <a href="#!">View more &gt;</a>
            </div>
            <ul>
              {trendingCoins.map((coin, index) => (
                <li key={index} className="coin-item">
                  <span>{coin.name}</span>
                  <span
                    style={{
                      color:
                        parseFloat(coin.changePercent24Hr) >= 0 ? "green" : "red",
                    }}
                  >
                    ${parseFloat(coin.priceUsd).toLocaleString()} (
                    {parseFloat(coin.changePercent24Hr).toFixed(2)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Gainers */}
          <div className="list-card">
            <div className="list-card-header">
              <h3>Top Gainers</h3>
              <a href="#!">View more &gt;</a>
            </div>
            <ul>
              {topGainers.map((coin, index) => (
                <li key={index} className="coin-item">
                  <span>{coin.name}</span>
                  <span
                    style={{
                      color:
                        parseFloat(coin.changePercent24Hr) >= 0 ? "green" : "red",
                    }}
                  >
                    ${parseFloat(coin.priceUsd).toLocaleString()} (
                    {parseFloat(coin.changePercent24Hr).toFixed(2)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;
