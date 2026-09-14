import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Grid2X2, Heart, LogOut, MessageCircle, Search, ShoppingCart, User, Package } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { language, setLanguage } = useContext(LanguageContext);
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/shop${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
  };

  return (
    <header className="market-header">
      <div className="market-topbar">
        <div className="market-shell market-topbar-inner">
          <div className="market-network-links">
            <span>TSU Market</span>
            <span>TSU Student</span>
            <span>TSU Community</span>
          </div>
          <div className="market-top-actions">
            <span>{language === 'TH' ? 'ช่วยเหลือ' : 'Help'}</span>
            <button className={language === 'TH' ? 'active' : ''} onClick={() => setLanguage('TH')}>TH</button>
            <span>|</span>
            <button className={language === 'EN' ? 'active' : ''} onClick={() => setLanguage('EN')}>EN</button>
            <span>|</span>
            <span>CN</span>
          </div>
        </div>
      </div>

      <nav className="market-navbar">
        <div className="market-shell market-nav-inner">
          <Link to="/" className="market-brand">
            <span className="market-brand-name">TSU Market</span>
            <span className="market-brand-sub">by Students</span>
          </Link>
          <Link to="/shop" className="market-articles">{language === 'TH' ? 'บทความ' : 'Articles'}</Link>

          <form className="market-search" onSubmit={submitSearch}>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder={language === 'TH' ? 'ค้นหา' : 'Search'} />
            <button type="submit" aria-label="Search"><Search size={20} /></button>
            <Link to="/shop" className="market-category-link">{language === 'TH' ? 'หมวดหมู่' : 'Categories'} <Grid2X2 size={19} /></Link>
          </form>

          <div className="market-nav-actions">
            <button className="market-icon-button" aria-label="Favorites"><Heart size={27} /></button>
            <Link to="/messages" className="market-icon-button" aria-label="Messages"><MessageCircle size={27} /></Link>
            <Link to="/cart" className="market-icon-button market-cart" aria-label="Cart">
              <ShoppingCart size={27} />
              {cartCount > 0 && <span className="market-cart-count">{cartCount}</span>}
            </Link>
            {!user ? (
              <Link to="/login" className="market-login">{language === 'TH' ? 'เข้าสู่ระบบ / สมัครสมาชิก' : 'Login / Register'}</Link>
            ) : (
              <div className="market-user-actions">
                <Link to="/profile"><User size={18} /> {language === 'TH' ? 'โปรไฟล์' : 'Profile'}</Link>
                <Link to="/my-products"><Package size={18} /> {language === 'TH' ? 'สินค้าของฉัน' : 'My Listings'}</Link>
                <button onClick={logout} className="market-logout" title="Logout"><LogOut size={18} /></button>
              </div>
            )}
            <Link to="/product/create" className="market-sell-button">{language === 'TH' ? 'ลงขาย' : 'Sell'}</Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
