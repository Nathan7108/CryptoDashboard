// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import CoinList from "./CoinList";
import "../css/dashboard.css";

const Dashboard = ({ searchTerm }) => {
  const [marketData, setMarketData] = useState(null);

  useEffect(() => {
    // Fetch market data from the FastAPI endpoint instead of using socket.io
    axios
      .get("http://localhost:8000/api/market")
      .then((res) => {
        if (res.data && res.data.data) {
          setMarketData(res.data.data);
        }
      })
      .catch((err) => console.error("Error fetching market data:", err));
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
