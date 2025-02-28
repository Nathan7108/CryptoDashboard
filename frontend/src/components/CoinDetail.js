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

ChartJS.defaults.elements.line.clip = false;

const rangeOptions = ["max", "1yr", "3m", "1m", "7d", "24hr"];

// Utility to compute the time range for each preset
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

// Interpolate crossing points (same as your existing logic)
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

// Split data above/below open
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

const crosshairPlugin = {
  id: "crosshair",
  afterInit: (chart, options) => {
    chart.crosshair = { x: null, y: null };
    const mouseMoveHandler = (evt) => {
      if (!chart.canvas) return;
      const rect = chart.canvas.getBoundingClientRect();
      if (!rect) return;
      chart.crosshair.x = evt.clientX - rect.left;
      chart.crosshair.y = evt.clientY - rect.top;
      if (chart.ctx) chart.draw();
    };
    const mouseLeaveHandler = () => {
      chart.crosshair.x = null;
      chart.crosshair.y = null;
      if (chart.ctx) chart.draw();
    };
    if (chart.canvas) {
      chart.canvas.addEventListener("mousemove", mouseMoveHandler);
      chart.canvas.addEventListener("mouseleave", mouseLeaveHandler);
    }
    chart._crosshairMouseMoveHandler = mouseMoveHandler;
    chart._crosshairMouseLeaveHandler = mouseLeaveHandler;
  },
  afterDraw: (chart, args, options) => {
    const ctx = chart.ctx;
    if (!ctx || !chart.crosshair || chart.crosshair.x === null) return;
    const { top, bottom, left, right } = chart.chartArea || {};
    if (top === undefined || bottom === undefined || left === undefined || right === undefined) return;
    
    const x = chart.crosshair.x;
    const y = chart.crosshair.y;
    ctx.save();
    ctx.setLineDash(options.dash || [5, 5]);
    ctx.lineWidth = options.lineWidth || 1;
    ctx.strokeStyle = options.color || "rgba(0,0,0,0.5)";
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.restore();
    if (chart.scales && chart.scales.yPrice) {
      const price = chart.scales.yPrice.getValueForPixel(y);
      const priceLabel = price.toFixed(2);
      ctx.save();
      ctx.font = options.font || "12px sans-serif";
      ctx.fillStyle = options.fontColor || "black";
      ctx.fillText(priceLabel, left + 5, y - 5);
      ctx.restore();
    }
  },
  afterDestroy: (chart) => {
    if (chart.canvas) {
      chart.canvas.removeEventListener("mousemove", chart._crosshairMouseMoveHandler);
      chart.canvas.removeEventListener("mouseleave", chart._crosshairMouseLeaveHandler);
    }
  },
};
ChartJS.register(crosshairPlugin);


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

  // Update domain range when preset changes
  useEffect(() => {
    const dataForRange = interpolatedData.length ? interpolatedData : null;
    const [start, end] = computeTimeRange(preset, dataForRange);
    setDomainTimeRange([start, end]);
    setSelectedRange([start, end]);
  }, [preset, interpolatedData]);

  // Fetch coin detail every 2s
  useEffect(() => {
    const fetchCoinDetail = () => {
      axios
        .get(`https://api.coincap.io/v2/assets/${coinId}?timestamp=${Date.now()}`)
        .then((res) => {
          setCoinDetail(res.data.data);
        })
        .catch((err) => console.error("Error fetching coin detail:", err));
    };
    fetchCoinDetail();
    const interval = setInterval(fetchCoinDetail, 2000);
    return () => clearInterval(interval);
  }, [coinId]);

  // Fetch historical data
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

        setStats({
          open: openVal,
          high,
          low,
          volume: 0, // If we eventually fetch volume data, set it here
        });

        const withCrossings = interpolateCrossing(sorted, openVal);
        const { above, below } = splitAboveBelow(withCrossings, openVal);
        setInterpolatedData(withCrossings);
        setAboveData(above);
        setBelowData(below);
      })
      .catch((err) => console.error(`Error fetching history data for ${coinId}:`, err));
  }, [coinId, range]);

  if (!coinDetail) {
    return <p>Loading coin details...</p>;
  }

  const currentPrice = parseFloat(coinDetail.priceUsd) || 0;
  const computedPriceChange = stats.open
    ? ((currentPrice - stats.open) / stats.open) * 100
    : 0;
  const priceChangeFormatted =
    computedPriceChange >= 0
      ? `^${computedPriceChange.toFixed(2)}%`
      : `v${Math.abs(computedPriceChange).toFixed(2)}%`;
  const priceChangeDisplayColor = currentPrice >= stats.open ? "green" : "red";

  // Datasets for the chart
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
    label: "Above Open",
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
    label: "Below Open",
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

  const chartData = { datasets: [aboveFillDataset, belowFillDataset, mainLineDataset] };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    scales: {
      x: {
        type: "time",
        time: { tooltipFormat: "PPpp" },
        min: selectedRange[0],
        max: selectedRange[1],
        grid: { display: false },
      },
      yPrice: {
        type: "linear",
        position: "left",
      },
    },
    plugins: {
      crosshair: {
        dash: [5, 5],
        lineWidth: 1,
        color: "rgba(0,0,0,0.5)",
        font: "12px sans-serif",
        fontColor: "black",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
      legend: { display: false },
    },
  };


  return (
    <div
      className="coin-detail-page"
      style={{
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "0 20px",
        boxSizing: "border-box",
      }}
    >
      {/* Top Section: Price, Price Change, and Coin Name */}
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <h1
          className="coin-price"
          style={{ margin: 0, fontSize: "3rem", fontWeight: "bold" }}
        >
          $
          {currentPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h1>
        {stats.open ? (
          <span
            className="price-change"
            style={{ color: priceChangeDisplayColor, fontSize: "1.2rem" }}
          >
            {priceChangeFormatted}
          </span>
        ) : (
          <span className="price-change">Loading...</span>
        )}
        <h2
          className="coin-name"
          style={{ marginTop: "5px", fontSize: "1.5rem", color: "#333" }}
        >
          {coinDetail.name} ({coinDetail.symbol})
        </h2>
      </div>
  
      {/* Unified Metrics Row */}
      <div
        className="metrics-row"
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          flexWrap: "nowrap",
          padding: "10px 0",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#f9f9f9",
          margin: "0 20px",
          marginBottom: "10px",
        }}
      >
        <div className="metric-item" style={{ textAlign: "center", flex: "1" }}>
          <strong>Market Cap</strong>
          <div>
            $
            {Number(coinDetail.marketCapUsd).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="metric-item" style={{ textAlign: "center", flex: "1" }}>
          <strong>24HR Volume</strong>
          <div>
            $
            {Number(coinDetail.volumeUsd24Hr).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="metric-item" style={{ textAlign: "center", flex: "1" }}>
          <strong>{preset.toUpperCase()} Open</strong>
          <div>
            $
            {stats.open.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="metric-item" style={{ textAlign: "center", flex: "1" }}>
          <strong>{preset.toUpperCase()} High</strong>
          <div>
            $
            {stats.high.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="metric-item" style={{ textAlign: "center", flex: "1" }}>
          <strong>{preset.toUpperCase()} Low</strong>
          <div>
            $
            {stats.low.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
  
      {/* Range Options Buttons */}
      <div
        className="range-options"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        {rangeOptions.map((option) => (
          <button
            key={option}
            onClick={() => {
              setPreset(option);
              setRange(option);
            }}
            className={preset === option ? "active" : ""}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: preset === option ? "#ffd600" : "#dee2e6",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
  
      {/* Chart Area */}
      <div
        className="coin-detail-chart"
        style={{ flex: 1, marginTop: "10px", padding: "0 20px" }}
      >
        <div style={{ width: "100%", height: "380px" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
  
      {/* Time Range Slider */}
      <div className="slider-wrapper">
        <TimeRangeSlider
          min={domainTimeRange[0]}
          max={domainTimeRange[1]}
          value={selectedRange}
          onRangeChange={(newRange) => setSelectedRange(newRange)}
        />
      </div>
    </div>
  );
  
  };

export default CoinDetail;
