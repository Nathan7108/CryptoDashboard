// In Dashboard.js
import React, { useEffect, useState } from "react";
import socket from "../services/socket";
import CoinList from "./CoinList";
import "../css/dashboard.css"; // Import Dashboard CSS

const Dashboard = () => {
  const [marketData, setMarketData] = useState(null);

  useEffect(() => {
    socket.on("market_data", (data) => {
      if (data && data.data) {
        setMarketData(data.data);
      }
    });

    return () => {
      socket.off("market_data");
    };
  }, []);

  return (
    <div className="dashboard">
      <h2>Market Data (Real-Time Updates)</h2>
      {marketData ? (
        <CoinList coins={marketData} />
      ) : (
        <p>Loading market data...</p>
      )}
    </div>
  );
};

export default Dashboard;
