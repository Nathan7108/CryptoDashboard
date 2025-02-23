import "../css/header.css";

const Header = () => {
  // Remove state and functions related to the modal if they're no longer needed
  // const [isSearchOpen, setIsSearchOpen] = useState(false);

  // const openSearch = () => setIsSearchOpen(true);
  // const closeSearch = () => setIsSearchOpen(false);

  return (
    <header className="header">
      <div className="header__logo">MyCryptoDash</div>
      <nav className="header__nav">
        <ul>
          <li>Cryptocurrencies</li>
          <li>Exchanges</li>
          <li>Community</li>
          <li>Products</li>
        </ul>
      </nav>
      <div className="header__actions">
        {/* Remove the search button if it's not needed or replace it with a different UI element */}
        <button className="header__search-button">
          🔍 Search
        </button>
        <button className="header__login">Log in</button>
        <div className="header__menu-icon">&#61;</div>
      </div>
    </header>
  );
};

export default Header;
