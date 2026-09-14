import React, { useEffect, useContext, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Tag, Edit, Trash2, ShoppingCart, MessageCircle, Heart } from 'lucide-react';
import { ProductContext } from '../context/ProductContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoriteContext';
import { parseApiResponse } from '../utils/api';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, deleteProduct, fetchRecommendations } = useContext(ProductContext);
  const { language } = useContext(LanguageContext);
  const { user, token } = useContext(AuthContext);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const product = products.find(prod => prod.id === parseInt(id));
  const [recommendations, setRecommendations] = useState([]);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const canManageProduct = !!user && (user.role === 'admin' || product?.sellerId === user.id);
  const isFav = product ? isFavorite(product.id) : false;

  useEffect(() => {
    if (product) fetchRecommendations(product.id).then(setRecommendations).catch(() => setRecommendations([]));
  }, [product, fetchRecommendations]);

  const handleDelete = async () => {
    if(window.confirm(language === 'TH' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?' : 'Are you sure you want to delete this?')) {
      try {
        await deleteProduct(product.id, token);
        alert(language === 'TH' ? 'ลบสินค้าสำเร็จ' : 'Deleted successfully');
        navigate('/shop');
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

  const handleToggleFavorite = async () => {
    if (!user) {
      if (window.confirm(language === 'TH' ? 'กรุณาเข้าสู่ระบบก่อนบันทึกรายการโปรด ต้องการไปหน้าเข้าสู่ระบบหรือไม่?' : 'Please login to manage wishlist. Go to login?')) {
        navigate('/login');
      }
      return;
    }
    setFavoriteLoading(true);
    try {
      await toggleFavorite(product.id);
    } catch (err) {
      alert(err.message || 'ไม่สามารถบันทึกรายการโปรดได้');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setSendingMessage(true);
    setMessageStatus('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, content: message })
      });
      await parseApiResponse(response);
      setMessage('');
      setMessageStatus(language === 'TH' ? 'ส่งข้อความถึงผู้ขายแล้ว' : 'Message sent to the seller');
    } catch (error) {
      setMessageStatus(error.message || (language === 'TH' ? 'ส่งข้อความไม่สำเร็จ' : 'Message failed'));
    } finally {
      setSendingMessage(false);
    }
  };

  if (!product) {
    return (
      <div className="container section text-center">
        <h2>{language === 'TH' ? 'ไม่พบสินค้า' : 'Product not found'}</h2>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {language === 'TH' ? 'กลับไปหน้าร้านค้า' : 'Back to Shop'}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in section">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 1rem' }}
          >
            <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} /> 
            {language === 'TH' ? 'กลับ' : 'Back'}
          </button>

          {canManageProduct && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link 
                to={`/product/edit/${product.id}`}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}
              >
                <Edit size={18} style={{ marginRight: '0.5rem' }} /> 
                {language === 'TH' ? 'แก้ไข' : 'Edit'}
              </Link>
              <button 
                onClick={handleDelete}
                className="btn"
                style={{ background: 'red', color: 'white', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', border: 'none' }}
              >
                <Trash2 size={18} style={{ marginRight: '0.5rem' }} /> 
                {language === 'TH' ? 'ลบ' : 'Delete'}
              </button>
            </div>

          )}
        </div>

        {!user && (
          <div style={{ marginBottom: '1.5rem', padding: '0.9rem 1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#475569', fontWeight: 600 }}>
            {language === 'TH' ? 'เข้าสู่ระบบก่อนจัดการสินค้า หรือดูสินค้าของคุณเอง' : 'Login to manage listings or view your own listings'}
          </div>
        )}

        {user && !canManageProduct && (
          <div style={{ marginBottom: '1.5rem', padding: '0.9rem 1.1rem', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', color: '#9a4d00', fontWeight: 600 }}>
            {language === 'TH' ? 'คุณต้องเป็นเจ้าของสินค้า หรือแอดมิน จึงสามารถแก้ไข/ลบประกาศนี้ได้' : 'Only the owner or admin can edit or delete this listing'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'start' }}>
          <div>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)', border: '1px solid #e2e8f0', background: '#fff' }}>
              <img 
                src={product.image || 'https://via.placeholder.com/600x400?text=No+Image'} 
                alt={product.title} 
                style={{ width: '100%', display: 'block', height: '520px', objectFit: 'cover' }} 
              />
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                title={isFav ? (language === 'TH' ? 'นำออกจากรายการโปรด' : 'Remove from Wishlist') : (language === 'TH' ? 'เพิ่มในรายการโปรด' : 'Add to Wishlist')}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  border: isFav ? '2px solid #ef4444' : '1px solid rgba(226, 232, 240, 0.8)',
                  background: isFav ? '#fff1f2' : 'rgba(255, 255, 255, 0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(6px)',
                  transform: isFav ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <Heart size={22} fill={isFav ? '#ef4444' : 'none'} color={isFav ? '#ef4444' : '#64748b'} />
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.45rem 0.8rem', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.76rem' }}>
                {product.category}
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', margin: '0.9rem 0 0.5rem', lineHeight: 1.1 }}>{product.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>฿{product.price}</span>
                <span style={{ padding: '0.35rem 0.7rem', background: product.status === 'SOLD' ? '#fee2e2' : product.status === 'RESERVED' ? '#fef3c7' : '#ecfdf5', color: product.status === 'SOLD' ? '#b91c1c' : product.status === 'RESERVED' ? '#92400e' : '#047857', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem' }}>
                  {product.status === 'SOLD' ? (language === 'TH' ? 'ขายแล้ว' : 'Sold') : product.status === 'RESERVED' ? (language === 'TH' ? 'จองแล้ว' : 'Reserved') : (language === 'TH' ? 'พร้อมขาย' : 'Available')}
                </span>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>{language === 'TH' ? 'รายละเอียดสินค้า' : 'Listing details'}</h3>
              <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, margin: 0 }}>
                {product.description}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddToCart}
                disabled={product.status === 'SOLD'}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.9rem 1.4rem', opacity: product.status === 'SOLD' ? 0.5 : 1 }}
              >
                <ShoppingCart size={18} />
                {product.status === 'SOLD' ? (language === 'TH' ? 'สินค้าขายแล้ว' : 'Sold out') : (language === 'TH' ? 'เพิ่มลงตะกร้า' : 'Add to cart')}
              </button>

              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  padding: '0.9rem 1.4rem',
                  borderRadius: '12px',
                  border: isFav ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                  background: isFav ? '#fef2f2' : '#ffffff',
                  color: isFav ? '#ef4444' : '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Heart size={19} fill={isFav ? '#ef4444' : 'none'} color={isFav ? '#ef4444' : '#64748b'} />
                {isFav 
                  ? (language === 'TH' ? 'ในรายการโปรด ❤️' : 'In Wishlist ❤️')
                  : (language === 'TH' ? 'เพิ่มในรายการโปรด' : 'Add to Wishlist')}
              </button>

              <Link to="/cart" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.9rem 1.4rem' }}>
                {language === 'TH' ? 'ดูตะกร้า' : 'View cart'}
              </Link>
            </div>

            {user && user.id !== product.sellerId && (
              <form onSubmit={handleSendMessage} style={{ border: '1px solid #dbeafe', borderRadius: '18px', padding: '1.25rem', background: '#f8fbff' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem' }}>
                  <MessageCircle size={19} color="#2563eb" />
                  {language === 'TH' ? 'คุยกับผู้ขาย' : 'Talk to the seller'}
                </h3>
                <textarea
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  maxLength={1000}
                  required
                  rows={3}
                  placeholder={language === 'TH' ? 'สอบถามรายละเอียดสินค้า...' : 'Ask about this product...'}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '10px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: messageStatus.includes('สำเร็จ') || messageStatus.includes('sent') ? '#15803d' : '#b45309', fontSize: '0.9rem' }}>{messageStatus}</span>
                  <button type="submit" className="btn btn-primary" disabled={sendingMessage || !message.trim()}>
                    <MessageCircle size={17} /> {sendingMessage ? (language === 'TH' ? 'กำลังส่ง...' : 'Sending...') : (language === 'TH' ? 'ส่งข้อความ' : 'Send message')}
                  </button>
                </div>
              </form>
            )}

            {!user && (
              <button type="button" onClick={() => navigate('/login')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <MessageCircle size={18} /> {language === 'TH' ? 'เข้าสู่ระบบเพื่อคุยกับผู้ขาย' : 'Log in to talk to the seller'}
              </button>
            )}
            
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', background: 'white' }}>
              <h3 style={{ marginBottom: '1rem' }}>{language === 'TH' ? 'ข้อมูลสินค้า' : 'Product Information'}</h3>
              <ul style={{ paddingLeft: '0', listStyle: 'none', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.9rem', margin: 0 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="#2563eb" /></div>
                  <div><strong>{language === 'TH' ? 'ผู้ขาย:' : 'Seller:'}</strong> {product.seller?.name || 'Unknown'}</div>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tag size={16} color="#047857" /></div>
                  <div><strong>{language === 'TH' ? 'สภาพ:' : 'Condition:'}</strong> {product.condition}</div>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={16} color="#b45309" /></div>
                  <div><strong>{language === 'TH' ? 'สถานที่นัดรับ:' : 'Meeting Location:'}</strong> {product.meetingLocation}</div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {recommendations.length > 0 && (
          <section style={{ marginTop: '4rem' }}>
            <h2>{language === 'TH' ? 'สินค้าอื่นที่คุณอาจสนใจ' : 'You may also like'}</h2>
            <div className="grid grid-cols-4 gap-6" style={{ marginTop: '1.5rem' }}>
              {recommendations.map(item => <Link key={item.id} to={`/product/${item.id}`} className="card" style={{ overflow: 'hidden' }}>
                <img src={item.image || 'https://via.placeholder.com/300x200?text=No+Image'} alt={item.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                <div style={{ padding: '1rem' }}><strong>{item.title}</strong><div style={{ marginTop: '0.5rem' }}>฿{item.price}</div></div>
              </Link>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
