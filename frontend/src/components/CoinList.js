// src/components/CoinList.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/dashboard.css";

const CoinList = ({ coins, searchTerm }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const coinsPerPage = 50;

  // Filter coins based on search term
  const filteredCoins = coins.filter((coin) =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const indexOfLastCoin = currentPage * coinsPerPage;
  const indexOfFirstCoin = indexOfLastCoin - coinsPerPage;
  const currentCoins = filteredCoins.slice(indexOfFirstCoin, indexOfLastCoin);
  const totalPages = Math.ceil(filteredCoins.length / coinsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="coin-list">
      <table className="coin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Symbol</th>
            <th>Price (USD)</th>
            <th>1hr</th>
            <th>24hr</th>
            <th>7d</th>
            <th>Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {currentCoins.map((coin) => (
            <CoinRow key={coin.id} coin={coin} />
          ))}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="pagination">
        <button onClick={handlePrevPage} disabled={currentPage === 1}>
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            className={currentPage === i + 1 ? "active" : ""}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

// Child component to render each coin row with historical data for 1hr and 7d changes
const CoinRow = ({ coin }) => {
  const [oneHrChange, setOneHrChange] = useState(null);
  const [sevenDayChange, setSevenDayChange] = useState(null);

  // Helper to render change with arrow and color
  const renderChange = (changeValue) => {
    const isPositive = changeValue >= 0;
    const arrow = isPositive ? "↑" : "↓";
    return (
      <span style={{ color: isPositive ? "green" : "red" }}>
        {arrow} {changeValue.toFixed(2)}%
      </span>
    );
  };

  // Compute percent change based on historical data:
  // percent change = ((latestPrice - firstPrice) / firstPrice) * 100
  const computeChange = (history) => {
    if (history && history.length > 0) {
      const firstPrice = parseFloat(history[0].priceUsd);
      const lastPrice = parseFloat(history[history.length - 1].priceUsd);
      if (firstPrice) {
        return ((lastPrice - firstPrice) / firstPrice) * 100;
      }
    }
    return 0;
  };

  useEffect(() => {
    // Fetch 1hr history
    fetch(`http://localhost:8000/api/history/${coin.id}?range=1hr`)
    .then((res) => res.json())
      .then((data) => {
        console.log("1hr data for", coin.id, data);
        if (data && data.data && data.data.length > 0) {
          const change = computeChange(data.data);
          console.log("Computed 1hr change:", change);
          setOneHrChange(change);
        } else {
          setOneHrChange(0);
        }
      })
      .catch((err) => {
        console.error("1hr fetch error", err);
        setOneHrChange(0);
      });
  
    // Fetch 7d history
    fetch(`http://localhost:8000/api/history/${coin.id}?range=7d`)
    .then((res) => res.json())
      .then((data) => {
        console.log("7d data for", coin.id, data);
        if (data && data.data && data.data.length > 0) {
          const change = computeChange(data.data);
          console.log("Computed 7d change:", change);
          setSevenDayChange(change);
        } else {
          setSevenDayChange(0);
        }
      })
      .catch((err) => {
        console.error("7d fetch error", err);
        setSevenDayChange(0);
      });
  }, [coin.id]);
  

  return (
    <tr>
      <td data-label="Name">
        {/* Coin name looks like plain text but is still clickable */}
        <Link
          to={`/coin/${coin.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {coin.name}
          <img
            src={`https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`}
            alt={`${coin.name} logo`}
            style={{
              height: "20px",
              width: "20px",
              marginLeft: "8px",
              verticalAlign: "middle",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
          />
        </Link>
      </td>
      <td data-label="Symbol">{coin.symbol}</td>
      <td data-label="Price">${parseFloat(coin.priceUsd).toFixed(2)}</td>
      <td data-label="1hr">
        {oneHrChange !== null ? renderChange(oneHrChange) : "Loading..."}
      </td>
      <td data-label="24hr">
        {renderChange(parseFloat(coin.changePercent24Hr))}
      </td>
      <td data-label="7d">
        {sevenDayChange !== null ? renderChange(sevenDayChange) : "Loading..."}
      </td>
      <td data-label="Market Cap">
        ${Number(coin.marketCapUsd).toLocaleString()}
      </td>
    </tr>
  );
};

export default CoinList;
