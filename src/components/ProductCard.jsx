import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Heart } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { ProductContext } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoriteContext';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const { user, token } = useContext(AuthContext);
  const { deleteProduct } = useContext(ProductContext);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const canManageProduct = !!user && (user.role === 'admin' || product.sellerId === user.id);
  const isFav = isFavorite(product.id);

  const handleDelete = async (e) => {
    e.preventDefault();
    if(window.confirm(language === 'TH' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?' : 'Are you sure you want to delete this?')) {
      try {
        await deleteProduct(product.id, token);
        alert(language === 'TH' ? 'ลบสินค้าสำเร็จ' : 'Deleted successfully');
      } catch (error) {
        alert(error.message || 'Delete failed');
      }
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product, 1);
    } catch (error) {
      alert(error.message || 'ไม่สามารถเพิ่มสินค้าในตะกร้าได้');
    }
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      if (window.confirm(language === 'TH' ? 'กรุณาเข้าสู่ระบบก่อนบันทึกรายการโปรด ต้องการเข้าสู่ระบบหรือไม่?' : 'Please login to save favorites. Go to login?')) {
        navigate('/login');
      }
      return;
    }
    await toggleFavorite(product.id);
  };

  return (
    <div className="card" style={{ position: 'relative' }}>
      {/* Floating Favorite Button (Top-Left) */}
      <button
        type="button"
        onClick={handleToggleFavorite}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10,
          background: isFav ? '#fff1f2' : 'rgba(255, 255, 255, 0.92)',
          border: isFav ? '1.5px solid #ef4444' : '1px solid rgba(226, 232, 240, 0.8)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s ease',
          transform: isFav ? 'scale(1.08)' : 'scale(1)'
        }}
        title={isFav ? (language === 'TH' ? 'นำออกจากรายการโปรด' : 'Remove from favorites') : (language === 'TH' ? 'เพิ่มในรายการโปรด' : 'Add to favorites')}
      >
        <Heart size={18} fill={isFav ? '#ef4444' : 'none'} color={isFav ? '#ef4444' : '#64748b'} />
      </button>
      {canManageProduct && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          <Link 
            to={`/product/edit/${product.id}`}
            style={{ background: 'var(--primary-color)', color: 'white', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}
            title={language === 'TH' ? 'แก้ไขสินค้า' : 'Edit listing'}
          >
            <span style={{ fontSize: '0.8rem' }}>✏️</span>
          </Link>
          <button 
            onClick={handleDelete}
            style={{ background: 'red', color: 'white', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}
            title={language === 'TH' ? 'ลบสินค้า' : 'Delete listing'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      <Link to={`/product/${product.id}`}>
        <img 
          src={product.image || 'https://via.placeholder.com/300x250?text=No+Image'} 
          alt={product.title} 
          style={{ width: '100%', height: '250px', objectFit: 'cover' }} 
        />
      </Link>
      <div style={{ padding: '1.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {product.category}
        </span>
        <Link to={`/product/${product.id}`}>
          <h3 style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1.25rem' }}>{product.title}</h3>
        </Link>
        <div className="flex items-center justify-between" style={{ marginTop: '1rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>฿{product.price}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: product.status === 'SOLD' ? '#b91c1c' : product.status === 'RESERVED' ? '#92400e' : '#047857' }}>
            {product.status === 'SOLD' ? (language === 'TH' ? 'ขายแล้ว' : 'Sold') : product.status === 'RESERVED' ? (language === 'TH' ? 'จองแล้ว' : 'Reserved') : (language === 'TH' ? 'พร้อมขาย' : 'Available')}
          </span>
          <Link to={`/product/${product.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            {language === 'TH' ? 'ดูรายละเอียด' : 'View'}
          </Link>
        </div>
        <button
          onClick={handleAddToCart}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '0.75rem', padding: '0.7rem 1rem' }}
        >
          {language === 'TH' ? 'เพิ่มลงตะกร้า' : 'Add to cart'}
        </button>
        {!user && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            {language === 'TH' ? 'เข้าสู่ระบบเพื่อจัดการประกาศ' : 'Login to manage this listing'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
