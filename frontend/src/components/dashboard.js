import React, { useEffect, useState } from "react";
import axios from "axios";
import CoinList from "./CoinList";
import "../css/dashboard.css";

const Dashboard = ({ searchTerm }) => {
  const [marketData, setMarketData] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/market")
      .then((res) => {
        if (res.data && res.data.data) {
          setMarketData(res.data.data);
        }
      })
      .catch((err) => console.error("Error fetching market data:", err));
  }, []);
  useEffect(() => {
    const fetchData = () => {
      axios
        .get("http://localhost:8000/api/market")
        .then((res) => {
          if (res.data && res.data.data) {
            setMarketData(res.data.data);
          }
        })
        .catch((err) => console.error("Error fetching market data:", err));
    };
  
    // Fetch immediately and then poll every 2 seconds
    fetchData();
    const intervalId = setInterval(fetchData, 2000);
  
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="dashboard">
      {marketData ? (
        // Render CoinList if market data is available
        <CoinList coins={marketData} searchTerm={searchTerm} />
      ) : (
        // Show loading message if market data is not yet available
        <p>Loading market data...</p>
      )}
    </div>
  );
};

export default Dashboard;
