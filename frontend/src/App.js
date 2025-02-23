// src/App.js
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Header from "./components/header";
import OverviewSection from "./components/OverviewSection";
import Dashboard from "./components/dashboard";
import CoinDetail from "./components/CoinDetail";

function App() {
  // Lift the search state here so the entire app can use it
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <BrowserRouter>
      {/* Single Header at the top */}
      <Header onSearch={setSearchTerm} />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <OverviewSection />
              {/* Pass the searchTerm down to Dashboard */}
              <Dashboard searchTerm={searchTerm} />
            </>
          }
        />
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
