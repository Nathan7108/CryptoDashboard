import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import TimeRangeSlider from "./TimeRangeSlider";
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  crosshairPlugin
);

ChartJS.defaults.elements.line.clip = false;

const rangeOptions = ["max", "1yr", "3m", "1m", "7d", "24hr"];

// Calculate time range based on preset
const computeTimeRange = (preset, fullData) => {
  const now = Date.now();
  let start;
  switch (preset) {
    case "max":
      start = fullData && fullData.length ? fullData[0].x : now - 365 * 24 * 60 * 60 * 1000;
      break;
    case "1yr":
      start = now - 365 * 24 * 60 * 60 * 1000;
      break;
    case "3m":
      start = now - 90 * 24 * 60 * 60 * 1000;
      break;
    case "1m":
      start = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case "7d":
      start = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "24hr":
      start = now - 24 * 60 * 60 * 1000;
      break;
    default:
      start = now - 24 * 60 * 60 * 1000;
  }
  return [start, now];
};

// Interpolate data for crossing points
function interpolateCrossing(data, open) {
  if (!data || data.length < 2) return data;
  const result = [];

  for (let i = 0; i < data.length - 1; i++) {
    const p1 = data[i];
    const p2 = data[i + 1];
    result.push(p1);

    const price1 = p1.y;
    const price2 = p2.y;

    if ((price1 - open) * (price2 - open) < 0) {
      const fraction = (open - price1) / (price2 - price1);
      const t1 = p1.x;
      const t2 = p2.x;
      const crossingX = t1 + fraction * (t2 - t1);

      result.push({ x: crossingX, y: open });
    }
  }
  result.push(data[data.length - 1]);
  return result;
}

// Split data into above and below open price
function splitAboveBelow(data, open) {
  const above = [];
  const below = [];
  data.forEach((pt) => {
    if (pt.y >= open) {
      above.push({ x: pt.x, y: pt.y });
      below.push({ x: pt.x, y: null });
    } else {
      below.push({ x: pt.x, y: pt.y });
      above.push({ x: pt.x, y: null });
    }
  });
  return { above, below };
}

// Custom crosshair plugin for Chart.js
const crosshairPlugin = {
  id: "crosshair",
  afterDraw: (chart, args, options) => {
    const tooltip = chart.tooltip;
    if (tooltip && tooltip._active && tooltip._active.length) {
      const ctx = chart.ctx;
      if (!ctx) return;
      const { top, bottom, left, right } = chart.chartArea;
      const activePoint = tooltip._active[0];
      const x = activePoint.element.x;
      const y = activePoint.element.y;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(options.dash || [2, 2]);
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.lineWidth = options.lineWidth || 1;
      ctx.strokeStyle = options.color || "rgba(0,0,0,0.3)";
      ctx.stroke();
      ctx.restore();
    }
  },
};

// Format duration based on preset
const formatDuration = (duration, preset) => {
  if (preset === "7d" || preset === "1yr" || preset === "3m" || preset === "max" || preset === "1m") {
    const days = duration / (1000 * 60 * 60 * 24);
    return `${days.toFixed(1)} days`;
  } else if (preset === "24hr") {
    const hours = duration / (1000 * 60 * 60);
    return `${hours.toFixed(1)} hours`;
  } else if (preset === "1hr") {
    const minutes = duration / (1000 * 60);
    return `${minutes.toFixed(1)} minutes`;
  } else {
    const hours = duration / (1000 * 60 * 60);
    return `${hours.toFixed(1)} hours`;
  }
};

const CoinDetail = ({ coinId = "bitcoin" }) => {
  const [coinDetail, setCoinDetail] = useState(null);
  const [interpolatedData, setInterpolatedData] = useState([]);
  const [aboveData, setAboveData] = useState([]);
  const [belowData, setBelowData] = useState([]);
  const [stats, setStats] = useState({ open: 0, high: 0, low: 0, volume: 0 });
  const [range, setRange] = useState("7d");
  const [domainTimeRange, setDomainTimeRange] = useState([0, Date.now()]);
  const [selectedRange, setSelectedRange] = useState([0, Date.now()]);
  const [preset, setPreset] = useState("7d");

  // Update time range when preset changes
  useEffect(() => {
    const dataForRange = interpolatedData.length ? interpolatedData : null;
    const [start, end] = computeTimeRange(preset, dataForRange);
    setDomainTimeRange([start, end]);
    setSelectedRange([start, end]);
  }, [preset, interpolatedData]);

  // Fetch coin history data
  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/history/${coinId}?range=${preset}`)
      .then((res) => {
        // process your data and update chart datasets...
      })
      .catch((err) => console.error(`Error fetching history data for ${coinId}:`, err));
  }, [coinId, preset]);

  // Fetch coin details
  useEffect(() => {
    const fetchCoinDetail = () => {
      axios
        .get(`https://api.coincap.io/v2/assets/${coinId}?timestamp=${Date.now()}`)
        .then((res) => {
          console.log("New coin detail data:", res.data.data);
          setCoinDetail(res.data.data);
        })
        .catch((err) => console.error("Error fetching coin detail:", err));
    };
    fetchCoinDetail();
    const interval = setInterval(() => fetchCoinDetail(), 2000);
    return () => clearInterval(interval);
  }, [coinId]);

  // Fetch and process historical data
  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/history/${coinId}?range=${range}`)
      .then((res) => {
        const rawData = res.data.data;
        if (!rawData || rawData.length < 1) {
          setInterpolatedData([]);
          setAboveData([]);
          setBelowData([]);
          setStats({ open: 0, high: 0, low: 0, volume: 0 });
          return;
        }
        const sorted = rawData
          .map((p) => ({
            x: +p.time,
            y: parseFloat(p.priceUsd),
          }))
          .sort((a, b) => a.x - b.x);

        const openVal = sorted[0].y;
        const allPrices = sorted.map((p) => p.y);
        const high = Math.max(...allPrices);
        const low = Math.min(...allPrices);
        setStats((prev) => ({
          ...prev,
          open: openVal,
          high,
          low,
          volume: 0,
        }));

        const withCrossings = interpolateCrossing(sorted, openVal);
        const { above, below } = splitAboveBelow(withCrossings, openVal);

        setInterpolatedData(withCrossings);
        setAboveData(above);
        setBelowData(below);
      })
      .catch((err) =>
        console.error(`Error fetching history data for ${coinId}:`, err)
      );
  }, [coinId, range]);

  if (!coinDetail) {
    return <p>Loading coin details...</p>;
  }

  const currentPrice = parseFloat(coinDetail.priceUsd);
  const computedPriceChange = stats.open
    ? ((currentPrice - stats.open) / stats.open) * 100
    : 0;
  const priceChangeFormatted =
    computedPriceChange >= 0
      ? `^${computedPriceChange.toFixed(2)}%`
      : `v${Math.abs(computedPriceChange).toFixed(2)}%`;
  const priceChangeDisplayColor = currentPrice >= stats.open ? "green" : "red";

  const mainLineDataset = {
    label: "Price",
    data: interpolatedData,
    borderWidth: 2,
    fill: false,
    tension: 0.2,
    pointRadius: 0,
    borderColor: "rgba(34,197,94,1)",
    segment: {
      borderColor: (ctx) => {
        const openVal = stats.open;
        if (openVal === 0) return "rgba(34,197,94,1)";
        const p0 = ctx.p0.parsed.y;
        const p1 = ctx.p1.parsed.y;
        if (p0 < openVal && p1 < openVal) return "rgba(239,68,68,1)";
        if (p0 >= openVal && p1 >= openVal) return "rgba(34,197,94,1)";
        const mid = (p0 + p1) / 2;
        return mid >= openVal ? "rgba(34,197,94,1)" : "rgba(239,68,68,1)";
      },
    },
    parsing: false,
    xAxisID: "x",
    yAxisID: "yPrice",
  };

  const aboveFillDataset = {
    label: "Above Fill",
    data: aboveData,
    borderWidth: 0,
    fill: true,
    pointRadius: 0,
    tension: 0.2,
    backgroundColor: "rgba(34,197,94,0.3)",
    parsing: false,
    xAxisID: "x",
    yAxisID: "yPrice",
  };

  const belowFillDataset = {
    label: "Below Fill",
    data: belowData,
    borderWidth: 0,
    fill: true,
    pointRadius: 0,
    tension: 0.2,
    backgroundColor: "rgba(239,68,68,0.3)",
    parsing: false,
    xAxisID: "x",
    yAxisID: "yPrice",
  };

  const chartData = {
    datasets: [aboveFillDataset, belowFillDataset, mainLineDataset],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "PPpp"
        },
        min: selectedRange[0],
        max: selectedRange[1],
        grid: {
          display: false,
        },
      },
      yPrice: {
        type: "linear",
        position: "left",
      },
    },
    plugins: {
      legend: { display: false },
      // ... (other plugins)
    },
  };

  return (
    <div className="coin-detail-page">
      {/* Header: Price & Coin Info */}
      <div className="coin-detail-header">
        <div className="price-section">
          <h1 className="coin-price">
            ${currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
          {stats.open ? (
            <span className="price-change" style={{ color: priceChangeDisplayColor }}>
              {priceChangeFormatted}
            </span>
          ) : (
            <span className="price-change">Loading...</span>
          )}
        </div>
        <div className="coin-info">
          <div className="coin-info-block">
            <strong>Market Cap. #{coinDetail.rank}</strong>
            <div>${Number(coinDetail.marketCapUsd).toLocaleString()}</div>
          </div>
          <div className="coin-info-block">
            <strong>Volume (24h) #{coinDetail.rank}</strong>
            <div>${Number(coinDetail.volumeUsd24Hr).toLocaleString()}</div>
          </div>
          <div className="coin-info-block">
            <strong>Supply (Circ. / Total / Max)</strong>
            <div>
              {coinDetail.supply} / {coinDetail.totalSupply} / {coinDetail.maxSupply}
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Preset Range Buttons */}
      <div className="coin-detail-yr-container">
        <div className="stats-info">
          <div className="stats-item">
            <strong>{preset.toUpperCase()} Open</strong>
            <span>
              ${stats.open.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="stats-item">
            <strong>{preset.toUpperCase()} High</strong>
            <span>
              ${stats.high.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="stats-item">
            <strong>{preset.toUpperCase()} Low</strong>
            <span>
              ${stats.low.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="stats-item">
            <strong>{preset.toUpperCase()} Vol.</strong>
            <span>
              ${stats.volume.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
        <div className="range-options">
          {rangeOptions.map((option) => (
            <button
              key={option}
              onClick={() => {
                setPreset(option);
                setRange(option);
              }}
              className={preset === option ? "active" : ""}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "500px" }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Slider at the Bottom */}
      <div className="slider-wrapper" style={{ marginTop: "20px", textAlign: "center" }}>
        <div className="slider-container">
          <TimeRangeSlider
            min={domainTimeRange[0]}
            max={domainTimeRange[1]}
            value={selectedRange}
            onRangeChange={(newRange) => setSelectedRange(newRange)}
          />
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;
