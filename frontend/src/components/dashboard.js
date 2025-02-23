// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import socket from "../services/socket";
import CoinList from "./CoinList";
import "../css/dashboard.css";

const Dashboard = ({ searchTerm }) => {
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
      {marketData ? (
        <CoinList coins={marketData} searchTerm={searchTerm} />
      ) : (
        <p>Loading market data...</p>
      )}
    </div>
  );
};

export default Dashboard;
