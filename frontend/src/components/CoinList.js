// src/components/CoinList.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../css/dashboard.css"; // Ensure this CSS file includes pagination styles

const CoinList = ({ coins }) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const coinsPerPage = 50;

  // Filter coins based on search input (by name or symbol)
  const filteredCoins = coins.filter((coin) =>
    coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())
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
      <div className="coin-list-header">
        <input
          type="text"
          placeholder="Search for a coin..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // Reset to first page when search changes
          }}
          className="coin-search-input"
        />
      </div>
      <table className="coin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Symbol</th>
            <th>Price (USD)</th>
            <th>Market Cap</th>
            <th>24h Change</th>
          </tr>
        </thead>
        <tbody>
          {currentCoins.map((coin) => (
            <tr key={coin.id}>
              <td data-label="Name">
                <Link to={`/coin/${coin.id}`}>{coin.name}</Link>
              </td>
              <td data-label="Symbol">{coin.symbol}</td>
              <td data-label="Price">
                ${parseFloat(coin.priceUsd).toFixed(2)}
              </td>
              <td data-label="Market Cap">
                ${Number(coin.marketCapUsd).toLocaleString()}
              </td>
              <td
                data-label="24h Change"
                style={{
                  color:
                    parseFloat(coin.changePercent24Hr) >= 0 ? "green" : "red",
                }}
              >
                {parseFloat(coin.changePercent24Hr).toFixed(2)}%
              </td>
            </tr>
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

export default CoinList;
