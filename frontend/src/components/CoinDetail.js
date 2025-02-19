import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "../css/CoinDetail.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const rangeOptions = ["max", "1yr", "3m", "1m", "7d", "24hr"];

const CoinDetail = ({ coinId = "bitcoin" }) => {
  const [historyData, setHistoryData] = useState(null);
  const [range, setRange] = useState("24hr");

  useEffect(() => {
    axios
      .get(`http://127.0.0.1:5000/api/history/${coinId}?range=${range}`)
      .then((response) => {
        setHistoryData(response.data.data);
      })
      .catch((err) =>
        console.error("Error fetching history data for", coinId, err)
      );
  }, [coinId, range]);

  if (!historyData) {
    return <p>Loading historical data for {coinId}...</p>;
  }

  const chartData = {
    labels: historyData.map((point) => point.time),
    datasets: [
      {
        label: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price (USD)`,
        data: historyData.map((point) => parseFloat(point.priceUsd)),
        fill: false,
        backgroundColor: "rgba(75,192,192,0.4)",
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1, // smooths out the line
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
      title: {
        display: true,
        text: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price History`,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "PPpp", // Date and time format
          unit: "day", // Adjust unit based on range if needed
        },
        title: {
          display: true,
          text: "Date",
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: "Price (USD)",
        },
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  return (
    <div className="coin-detail container">
      <h2>
        {coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price History
      </h2>
      {/* Range selection buttons */}
      <div className="range-options">
        {rangeOptions.map((option) => (
          <button
            key={option}
            onClick={() => setRange(option)}
            className={range === option ? "active" : ""}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Chart container with fixed height */}
      <div style={{ height: "500px" }}>
        <Line data={chartData} options={chartOptions} redraw />
      </div>
    </div>
  );
};

export default CoinDetail;
