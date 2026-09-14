import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CircleEllipsis, Home as HomeIcon, Laptop, Smartphone, Tv, WashingMachine } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { LanguageContext } from '../context/LanguageContext';
import { ProductContext } from '../context/ProductContext';

const Home = () => {
  const { language } = useContext(LanguageContext);
  const { products } = useContext(ProductContext);
  const navigate = useNavigate();

  const categories = [
    { name: 'Furniture', label: language === 'TH' ? 'เฟอร์นิเจอร์' : 'Furniture', icon: HomeIcon },
    { name: 'Electronics', label: language === 'TH' ? 'เครื่องใช้ไฟฟ้า' : 'Electronics', icon: Tv },
    { name: 'Dorm Essentials', label: language === 'TH' ? 'ของใช้ในหอ' : 'Dorm essentials', icon: WashingMachine },
    { name: 'Books', label: language === 'TH' ? 'หนังสือ' : 'Books', icon: BookOpen },
    { name: 'Clothes', label: language === 'TH' ? 'เสื้อผ้า' : 'Clothes', icon: Laptop },
    { name: 'Others', label: language === 'TH' ? 'อื่น ๆ' : 'Others', icon: CircleEllipsis },
  ];

  return (
    <main className="market-home">
      <section className="market-hero">
        <div className="market-hero-content">
          <p className="market-hero-kicker">TSU STUDENT MARKETPLACE</p>
          <h1>{language === 'TH' ? 'ซื้อ-ขาย ของออนไลน์ จบง่ายที่ TSU Market' : 'Buy and sell online, made easy at TSU Market'}</h1>
          <div className="market-hero-points">
            <span>✓ {language === 'TH' ? 'ตรวจสอบผู้ขาย' : 'Verified sellers'}</span>
            <span>● {language === 'TH' ? 'แชทในระบบ' : 'In-app chat'}</span>
          </div>
        </div>
        <div className="market-hero-shade" />
      </section>

      <section className="market-category-panel market-shell">
        <div className="market-category-tabs">
          <button className="active">{language === 'TH' ? 'ยอดนิยม' : 'Popular'}</button>
          <button onClick={() => navigate('/shop')}><HomeIcon size={18} /> {language === 'TH' ? 'มาร์เก็ตเพลส' : 'Marketplace'}</button>
          <button onClick={() => navigate('/shop?category=Electronics')}><Smartphone size={18} /> {language === 'TH' ? 'อุปกรณ์ไอที' : 'Tech'}</button>
          <button onClick={() => navigate('/shop?category=Furniture')}><HomeIcon size={18} /> {language === 'TH' ? 'ของใช้หอ' : 'Dorm'}</button>
        </div>
        <div className="market-category-grid">
          {categories.map(({ name, label, icon: Icon }) => (
            <button key={name} onClick={() => navigate(`/shop?category=${encodeURIComponent(name)}`)} className="market-category-tile">
              <span className="market-category-icon"><Icon size={38} strokeWidth={1.7} /></span>
              <strong>{label}</strong>
            </button>
          ))}
          <button onClick={() => navigate('/shop')} className="market-category-tile">
            <span className="market-category-icon"><CircleEllipsis size={38} strokeWidth={1.7} /></span>
            <strong>{language === 'TH' ? 'เพิ่มเติม' : 'More'}</strong>
          </button>
        </div>
      </section>

      <section className="market-home-content market-shell">
        <div className="market-section-heading">
          <div><p className="market-eyebrow">TSU MARKET</p><h2>{language === 'TH' ? 'สินค้าน่าสนใจสำหรับชีวิตในมหาวิทยาลัย' : 'Find your next campus essential'}</h2></div>
          <Link to="/shop">{language === 'TH' ? 'ดูสินค้าทั้งหมด' : 'View all'} →</Link>
        </div>
        <div className="market-product-grid">
          {products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </main>
  );
};

export default Home;
