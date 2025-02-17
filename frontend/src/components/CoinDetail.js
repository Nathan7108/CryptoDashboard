// src/components/CoinDetail.js
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "../css/CoinDetail.css";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from "chart.js";
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
  
const CoinDetail = ({ coinId = "bitcoin" }) => {
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => {
    axios
      .get(`http://127.0.0.1:5000/api/history/${coinId}?interval=h1`)
      .then((response) => {
        setHistoryData(response.data.data);
      })
      .catch((err) => console.error("Error fetching history data", err));
  }, [coinId]);

  if (!historyData) {
    return <p>Loading historical data for {coinId}...</p>;
  }

  const chartData = {
    labels: historyData.map((point) =>
      new Date(point.time).toLocaleTimeString()
    ),
    datasets: [
      {
        label: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price (USD)`,
        data: historyData.map((point) => parseFloat(point.priceUsd)),
        fill: false,
        backgroundColor: "rgba(75,192,192,0.4)",
        borderColor: "rgba(75,192,192,1)",
      },
    ],
  };

  return (
    <div className="coin-detail container">
      <h2>
        {coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price History
      </h2>
      <Line data={chartData} redraw />
    </div>
  );
};

export default CoinDetail;
