// src/components/CoinList.js
import React from "react";
import { Link } from "react-router-dom";
import "../css/dashboard.css"; // Ensure your Dashboard.css (or a dedicated table CSS file) is imported

const CoinList = ({ coins }) => {
  if (!coins || coins.length === 0) {
    return <p>No coins available</p>;
  }

  return (
    <div>
      <h2>Coin List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price (USD)</th>
            <th>24h Change</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => (
            <tr key={coin.id}>
              <td data-label="Name">
                <Link to={`/coin/${coin.id}`}>{coin.name}</Link>
              </td>
              <td data-label="Price">${parseFloat(coin.priceUsd).toFixed(2)}</td>
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
    </div>
  );
};

export default CoinList;
