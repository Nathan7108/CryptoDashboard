// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Header from "./components/header";
import Dashboard from "./components/dashboard";
import CoinDetail from "./components/CoinDetail";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/coin/:coinId" element={<CoinDetailWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

// Wrapper to extract coinId from URL parameters and pass it to CoinDetail
const CoinDetailWrapper = () => {
  const { coinId } = useParams();
  return <CoinDetail coinId={coinId} />;
};

export default App;
