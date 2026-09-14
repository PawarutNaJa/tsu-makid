import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ProductContext } from '../context/ProductContext';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Plus } from 'lucide-react';

const MyProducts = () => {
  const { user, token } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const { products, deleteProduct, updateProduct, fetchPendingCategories, approveCategory } = useContext(ProductContext);
  const [pendingCategories, setPendingCategories] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingCategories(token).then(setPendingCategories).catch(() => setPendingCategories([]));
    }
  }, [user, token, fetchPendingCategories]);

  const myProducts = user
    ? products.filter(product => user.role === 'admin' || product.sellerId === user.id)
    : [];

  const handleDelete = async (id) => {
    if (!window.confirm(language === 'TH' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?' : 'Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct(id, token);
    } catch (error) {
      alert(error.message || 'Delete failed');
    }
  };

  const handleStatusChange = async (product, status) => {
    try {
      await updateProduct(product.id, { status }, token);
    } catch (error) {
      alert(error.message || 'Status update failed');
    }
  };

  const statusLabel = (status) => status === 'SOLD'
    ? (language === 'TH' ? 'ขายแล้ว' : 'Sold')
    : status === 'RESERVED'
      ? (language === 'TH' ? 'จองแล้ว' : 'Reserved')
      : (language === 'TH' ? 'พร้อมขาย' : 'Available');

  const handleApproveCategory = async (id) => {
    try {
      await approveCategory(id, token);
      setPendingCategories(categories => categories.filter(category => category.id !== id));
    } catch (error) {
      alert(error.message || 'Approval failed');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 0', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{language === 'TH' ? 'สินค้าของฉัน' : 'My Listings'}</h2>
          {user && (
            <div style={{ marginTop: '0.4rem', color: '#64748b', fontSize: '0.92rem' }}>
              {user.role === 'admin' ? (language === 'TH' ? 'คุณเป็นแอดมิน จัดการสินค้าทั้งหมดได้' : 'You are admin and can manage all listings') : (language === 'TH' ? 'รายการสินค้าที่คุณลงขาย' : 'Products you have listed')}
            </div>
          )}
        </div>
        {user ? (
          <Link to="/product/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-color)' }}>
            <Plus size={20} /> {language === 'TH' ? 'ลงขายสินค้า' : 'Create Listing'}
          </Link>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-color)' }}>
            <Plus size={20} /> {language === 'TH' ? 'เข้าสู่ระบบก่อนลงขาย' : 'Login to list'}
          </Link>
        )}
      </div>

      {!user ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '16px', color: '#475569' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#0f172a' }}>{language === 'TH' ? 'เข้าสู่ระบบก่อนลบ/แก้ไข' : 'Login required to edit or delete'}</strong>
          {language === 'TH' ? 'กรุณาเข้าสู่ระบบเพื่อดูสินค้าของคุณและจัดการประกาศของคุณ' : 'Please sign in to view your listings and manage your products.'}
        </div>
      ) : myProducts.length === 0 ? (
        <p>{language === 'TH' ? 'คุณยังไม่มีสินค้าที่ลงขาย' : "You haven't listed any products yet."}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {myProducts.map(product => (
            <div key={product.id} className="product-card" style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <img src={product.image || 'https://via.placeholder.com/300x200?text=No+Image'} alt={product.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{product.title}</h3>
                <p style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '1.25rem', marginBottom: '1rem' }}>฿{product.price}</p>
                <select value={product.status || 'AVAILABLE'} onChange={event => handleStatusChange(product, event.target.value)} style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem' }}>
                  <option value="AVAILABLE">{statusLabel('AVAILABLE')}</option>
                  <option value="RESERVED">{statusLabel('RESERVED')}</option>
                  <option value="SOLD">{statusLabel('SOLD')}</option>
                </select>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link to={`/product/edit/${product.id}`} className="btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
                    <Edit size={16} /> {language === 'TH' ? 'แก้ไข' : 'Edit'}
                  </Link>
                  <button onClick={() => handleDelete(product.id)} className="btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                    <Trash2 size={16} /> {language === 'TH' ? 'ลบ' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'admin' && pendingCategories.length > 0 && (
        <section style={{ marginTop: '3rem', padding: '1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px' }}>
          <h3>{language === 'TH' ? 'คำขอหมวดหมู่รออนุมัติ' : 'Pending category requests'}</h3>
          {pendingCategories.map(category => (
            <div key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
              <span>{category.name}</span>
              <button className="btn btn-primary" onClick={() => handleApproveCategory(category.id)}>{language === 'TH' ? 'อนุมัติ' : 'Approve'}</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default MyProducts;
