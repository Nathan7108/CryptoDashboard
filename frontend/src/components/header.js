// src/components/Header.js
import React from "react";
import "../css/Header.css"; // Import the CSS file

const Header = () => {
  return (
    <header className="header">
      {/* Left: Logo/Brand */}
      <div className="header__logo">MyCryptoDash</div>

      {/* Center: Navigation Links */}
      <nav className="header__nav">
        <ul>
          <li>Cryptocurrencies</li>
          <li>Exchanges</li>
          <li>Community</li>
          <li>Products</li>
        </ul>
      </nav>

      {/* Right: Search Bar + Login Button + (Optional) Hamburger Menu */}
      <div className="header__actions">
        <input
          type="text"
          className="header__search"
          placeholder="Search..."
        />
        <button className="header__login">Log in</button>
        <div className="header__menu-icon">&#61;</div> 
        {/* The '=' symbol or a hamburger icon (e.g., &#9776;) */}
      </div>
    </header>
  );
};

export default Header;
