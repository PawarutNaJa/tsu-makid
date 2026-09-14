import React, { useContext, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoriteContext';
import { useCart } from '../context/CartContext';
import {
  User, MapPin, Package, CreditCard, Heart, Edit2, Plus, Trash2,
  ShieldCheck, Clock, CheckCircle2, DollarSign, Truck, ShoppingBag,
  Navigation
} from 'lucide-react';
import { parseApiResponse } from '../utils/api';

const Profile = () => {
  const { user, token } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const { favorites, loading: favoritesLoading, removeFavorite, fetchFavorites } = useFavorites();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'personal';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert(language === 'TH' ? 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP' : 'Only JPG, PNG, and WebP files are supported');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'TH' ? 'รูปภาพต้องมีขนาดไม่เกิน 2 MB' : 'Image must be 2 MB or smaller');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handover Edit State (จุดนัดรับ / ที่อยู่ / เบอร์ติดต่อ)
  const [editingHandoverOrderId, setEditingHandoverOrderId] = useState(null);
  const [editHandoverLocation, setEditHandoverLocation] = useState('');
  const [editHandoverAddress, setEditHandoverAddress] = useState('');
  const [editHandoverPhone, setEditHandoverPhone] = useState('');

  // Edit Address State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addrTitle, setAddrTitle] = useState('');
  const [addrText, setAddrText] = useState('');
  const [addrDefault, setAddrDefault] = useState(false);

  // Orders State (Escrow & Handover)
  const [orderRole, setOrderRole] = useState(searchParams.get('role') || 'buyer'); // 'buyer' or 'seller'
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Mock data for payments
  const mockPayments = [
    { id: 1, type: 'Credit Card', provider: 'Visa', ending: '4242', isDefault: true },
    { id: 2, type: 'Wallet', provider: 'TrueMoney Wallet', balance: 500 }
  ];

  const handleAddWishlistToCart = async (product) => {
    try {
      await addToCart(product, 1);
      alert(language === 'TH' ? `เพิ่ม "${product.title}" ลงในตะกร้าสินค้าแล้ว` : `Added "${product.title}" to cart`);
    } catch (err) {
      alert(err.message || 'ไม่สามารถเพิ่มสินค้าลงในตะกร้าได้');
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFavorite(productId);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      setProfileData(data);
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const [buyerRes, sellerRes] = await Promise.all([
        fetch('/api/orders/buyer', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders/seller', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const bData = await parseApiResponse(buyerRes);
      const sData = await parseApiResponse(sellerRes);
      setBuyerOrders(Array.isArray(bData) ? bData : []);
      setSellerOrders(Array.isArray(sData) ? sData : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchOrders();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'wishlist') {
      fetchFavorites();
    }
  }, [token, activeTab, fetchFavorites]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, phone: editPhone, studentId: editStudentId, avatar: editAvatar })
      });
      const data = await parseApiResponse(res);
      localStorage.setItem('token', data.token);
      alert(language === 'TH' ? 'บันทึกข้อมูลส่วนตัวสำเร็จ' : 'Profile updated');
      setIsEditingProfile(false);
      fetchProfile();
      fetchOrders(); // Refresh orders so new phone/studentId automatically reflects in handover details!
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSaveHandover = async (e, orderId) => {
    e.preventDefault();
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/handover`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          meetingLocation: editHandoverLocation,
          deliveryAddress: editHandoverAddress,
          contactPhone: editHandoverPhone
        })
      });
      const data = await parseApiResponse(res);
      alert(data.message || (language === 'TH' ? 'อัปเดตข้อมูลการนัดรับเรียบร้อยแล้ว' : 'Handover details updated'));
      setEditingHandoverOrderId(null);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const method = editingAddressId ? 'PUT' : 'POST';
      const url = editingAddressId ? `/api/users/addresses/${editingAddressId}` : '/api/users/addresses';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: addrTitle, addressText: addrText, isDefault: addrDefault })
      });
      await parseApiResponse(res);
      
      setShowAddressForm(false);
      fetchProfile();
      fetchOrders();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm(language === 'TH' ? 'ยืนยันการลบที่อยู่นี้?' : 'Delete this address?')) return;
    try {
      const res = await fetch(`/api/users/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await parseApiResponse(res);
      fetchProfile();
      fetchOrders();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await fetch(`/api/users/addresses/${id}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      await parseApiResponse(res);
      fetchProfile();
    } catch (error) {
      alert(error.message);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddrTitle('');
    setAddrText('');
    setAddrDefault(false);
    setShowAddressForm(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddrTitle(addr.title);
    setAddrText(addr.addressText);
    setAddrDefault(addr.isDefault);
    setShowAddressForm(true);
  };

  // --- ESCROW WORKFLOW ACTIONS ---

  // 1. Seller confirms handover / delivery
  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm(language === 'TH' 
      ? 'ยืนยันว่าคุณได้นำสินค้าไปส่งมอบให้ผู้ซื้อตามจุดนัดหมายเรียบร้อยแล้ว?' 
      : 'Confirm that you have delivered the item to the buyer at the meeting location?')) return;
    
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      alert(data.message || (language === 'TH' ? 'ยืนยันการส่งมอบเรียบร้อย' : 'Delivery confirmed'));
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Buyer confirms receipt
  const handleConfirmReceive = async (orderId) => {
    if (!window.confirm(language === 'TH' 
      ? 'คุณได้ตรวจสอบและได้รับสินค้าจากผู้ขายเรียบร้อยแล้วใช่หรือไม่?\n\n*หมายเหตุ: เมื่อกดยืนยันแล้ว ระบบจะเปิดสิทธิ์ให้ผู้ขายสามารถกดรับเงินค่าสินค้าจากตัวกลางได้ทันที' 
      : 'Have you inspected and received the item from the seller?\n\n*Note: Confirming will allow the seller to claim the funds held in escrow.')) return;
    
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/receive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      alert(data.message || (language === 'TH' ? 'ยืนยันการรับสินค้าเรียบร้อย' : 'Receipt confirmed'));
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Seller claims payout after buyer confirmed receipt
  const handleClaimPayout = async (orderId, amount) => {
    if (!window.confirm(language === 'TH' 
      ? `ยืนยันการกดรับเงินค่าสินค้า ฿${Number(amount).toLocaleString()} เข้าบัญชี/กระเป๋าเงินของคุณ?` 
      : `Claim payout of ฿${Number(amount).toLocaleString()} to your account?`)) return;
    
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/payout`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      alert(data.message || (language === 'TH' ? 'รับเงินเข้ากระเป๋าสำเร็จ' : 'Payout completed'));
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID_ESCROW':
        return {
          text: language === 'TH' ? 'รอผู้ขายส่งมอบ (เงินอยู่ตัวกลาง)' : 'Escrow Protected - Awaiting Handover',
          class: 'escrow-badge-pending'
        };
      case 'DELIVERED':
        return {
          text: language === 'TH' ? 'ผู้ขายส่งมอบแล้ว (รอผู้ซื้อตรวจรับ)' : 'Delivered - Awaiting Buyer Check',
          class: 'escrow-badge-delivered'
        };
      case 'RECEIVED':
        return {
          text: language === 'TH' ? 'ผู้ซื้อรับของแล้ว (พร้อมจ่ายเงิน)' : 'Received - Ready for Payout',
          class: 'escrow-badge-received'
        };
      case 'COMPLETED':
        return {
          text: language === 'TH' ? 'สำเร็จเรียบร้อย (โอนเงินแล้ว)' : 'Completed & Paid',
          class: 'escrow-badge-completed'
        };
      default:
        return { text: status, class: 'escrow-badge-pending' };
    }
  };

  const getStepProgress = (status) => {
    switch (status) {
      case 'PAID_ESCROW': return 1;
      case 'DELIVERED': return 2;
      case 'RECEIVED': return 3;
      case 'COMPLETED': return 4;
      default: return 1;
    }
  };

  const renderContent = () => {
    if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

    switch (activeTab) {
      case 'personal':
        return (
          <div className="profile-section animate-fade-in">
            <h2 className="profile-section-title">{language === 'TH' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}</h2>
            <div className="card profile-info-card">
              {!isEditingProfile ? (
                <>
                  <div className="profile-info-row">
                    <span className="profile-info-label">{language === 'TH' ? 'ชื่อ-นามสกุล' : 'Name'}</span>
                    <span className="profile-info-value">{profileData?.name || '-'}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">{language === 'TH' ? 'อีเมล' : 'Email'}</span>
                    <span className="profile-info-value">{profileData?.email || '-'}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">{language === 'TH' ? 'เบอร์โทรศัพท์' : 'Phone'}</span>
                    <span className="profile-info-value">{profileData?.phone || (language === 'TH' ? 'ยังไม่ได้ระบุ' : 'Not provided')}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">{language === 'TH' ? 'รหัสนิสิต' : 'Student ID'}</span>
                    <span className="profile-info-value">{profileData?.studentId || '-'}</span>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem' }} onClick={() => {
                    setEditName(profileData?.name || '');
                    setEditPhone(profileData?.phone || '');
                    setEditStudentId(profileData?.studentId || '');
                    setEditAvatar(profileData?.avatar || '');
                    setIsEditingProfile(true);
                  }}>
                    <Edit2 size={16} style={{ marginRight: '0.5rem' }} /> {language === 'TH' ? 'แก้ไขข้อมูล' : 'Edit Info'}
                  </button>
                </>
              ) : (
                <form onSubmit={handleUpdateProfile}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'รูปโปรไฟล์' : 'Profile Picture'}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 }}>
                        {editAvatar ? (
                          <img src={editAvatar} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <User size={32} color="#94a3b8" />
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="input" style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'ชื่อ-นามสกุล' : 'Name'}</label>
                    <input className="input" type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'อีเมล (ไม่สามารถเปลี่ยนได้)' : 'Email (Cannot be changed)'}</label>
                    <input className="input" type="email" value={profileData?.email} disabled style={{ opacity: 0.7, background: '#f5f5f5' }} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'เบอร์โทรศัพท์ (ใช้แสดงในใบนัดส่งของ)' : 'Phone (Shown in Handover Details)'}</label>
                    <input className="input" type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'รหัสนิสิต' : 'Student ID'}</label>
                    <input className="input" type="text" value={editStudentId} onChange={e => setEditStudentId(e.target.value)} placeholder="เช่น 66xxxxxxxx" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary">{language === 'TH' ? 'บันทึก' : 'Save'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(false)}>{language === 'TH' ? 'ยกเลิก' : 'Cancel'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      
      case 'addresses':
        return (
          <div className="profile-section animate-fade-in">
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="profile-section-title">{language === 'TH' ? 'ที่อยู่ในการจัดส่ง' : 'Shipping Addresses'}</h2>
              {!showAddressForm && (
                <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.95rem' }} onClick={openAddAddress}>
                  <Plus size={16} style={{ marginRight: '0.4rem' }} /> {language === 'TH' ? 'เพิ่มที่อยู่' : 'Add Address'}
                </button>
              )}
            </div>
            
            {showAddressForm ? (
              <div className="card profile-info-card animate-fade-in" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#1c2759' }}>{editingAddressId ? (language === 'TH' ? 'แก้ไขที่อยู่' : 'Edit Address') : (language === 'TH' ? 'เพิ่มที่อยู่ใหม่' : 'Add New Address')}</h3>
                <form onSubmit={handleSaveAddress}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'หัวข้อที่อยู่ (เช่น หอพัก, บ้าน)' : 'Address Title (e.g., Home, Dorm)'}</label>
                    <input className="input" type="text" value={addrTitle} onChange={e => setAddrTitle(e.target.value)} required placeholder={language === 'TH' ? 'หอพักนิสิต' : 'Dorm'} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{language === 'TH' ? 'รายละเอียดที่อยู่' : 'Address Details'}</label>
                    <textarea className="input" rows="3" value={addrText} onChange={e => setAddrText(e.target.value)} required placeholder={language === 'TH' ? 'บ้านเลขที่/ห้องพัก, หอพัก, ตำบล, อำเภอ' : 'Full address details'}></textarea>
                  </div>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="isDefault" checked={addrDefault} onChange={e => setAddrDefault(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="isDefault" style={{ fontWeight: 600, cursor: 'pointer' }}>{language === 'TH' ? 'ตั้งเป็นที่อยู่หลัก' : 'Set as default address'}</label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary">{language === 'TH' ? 'บันทึกที่อยู่' : 'Save Address'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowAddressForm(false)}>{language === 'TH' ? 'ยกเลิก' : 'Cancel'}</button>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="grid gap-4">
              {profileData?.addresses && profileData.addresses.length > 0 ? (
                profileData.addresses.map(addr => (
                  <div key={addr.id} className={`card profile-address-card ${addr.isDefault ? 'default' : ''}`}>
                    <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 className="profile-address-title">
                        {addr.title} {addr.isDefault && <span className="profile-badge-primary">{language === 'TH' ? 'ค่าเริ่มต้น' : 'Default'}</span>}
                      </h3>
                      <div className="flex gap-3">
                        {!addr.isDefault && (
                          <button onClick={() => handleSetDefaultAddress(addr.id)} style={{ fontSize: '0.85rem', color: '#1c2759', fontWeight: 600, textDecoration: 'underline' }}>
                            {language === 'TH' ? 'ตั้งเป็นค่าเริ่มต้น' : 'Set Default'}
                          </button>
                        )}
                        <button className="btn-icon" aria-label="Edit" onClick={() => openEditAddress(addr)}><Edit2 size={18} /></button>
                        <button className="btn-icon" aria-label="Delete" onClick={() => handleDeleteAddress(addr.id)} style={{ color: '#dc2626' }}><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <p className="profile-address-text">{addr.addressText}</p>
                  </div>
                ))
              ) : (
                !showAddressForm && <p style={{ color: '#72788b', textAlign: 'center', padding: '2rem' }}>{language === 'TH' ? 'ยังไม่มีที่อยู่จัดส่ง' : 'No shipping addresses yet.'}</p>
              )}
            </div>
          </div>
        );

      case 'orders':
        const currentOrders = orderRole === 'buyer' ? buyerOrders : sellerOrders;

        return (
          <div className="profile-section animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="profile-section-title">
                  {language === 'TH' ? 'การนัดรับสินค้าและระบบตัวกลาง' : 'Handover & Escrow Orders'}
                </h2>
                <p className="profile-section-subtitle">
                  {language === 'TH' 
                    ? 'ระบบนัดส่งมอบสินค้าโดยตรงระหว่างผู้ซื้อ-ผู้ขาย พร้อมระบบตัวกลางค้ำประกันเงิน' 
                    : 'Direct in-person handover system protected by platform escrow'}
                </p>
              </div>

              {/* Sub-tab switcher: Buyer vs Seller */}
              <div className="escrow-subtabs">
                <button
                  className={`escrow-subtab-btn ${orderRole === 'buyer' ? 'active' : ''}`}
                  onClick={() => setOrderRole('buyer')}
                >
                  <ShoppingBag size={18} />
                  <span>{language === 'TH' ? 'สินค้าที่ฉันซื้อ (ผู้รับ)' : 'My Purchases (Buyer)'}</span>
                  <span className="escrow-subtab-badge">{buyerOrders.length}</span>
                </button>
                <button
                  className={`escrow-subtab-btn ${orderRole === 'seller' ? 'active' : ''}`}
                  onClick={() => setOrderRole('seller')}
                >
                  <Truck size={18} />
                  <span>{language === 'TH' ? 'สินค้าที่ต้องไปส่ง (ผู้ขาย)' : 'To Deliver (Seller)'}</span>
                  <span className="escrow-subtab-badge">{sellerOrders.length}</span>
                </button>
              </div>
            </div>

            {/* Escrow Informational Card */}
            <div className="escrow-info-banner">
              <div className="escrow-info-icon">
                <ShieldCheck size={28} color="#16a34a" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
                  {language === 'TH' ? '🛡️ กฎความปลอดภัยระบบตัวกลางนัดรับของ' : '🛡️ Escrow Handover Rules'}
                </h4>
                <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {orderRole === 'buyer' ? (
                    language === 'TH' ? (
                      <>
                        เงินของคุณปลอดภัย 100% อยู่ในระบบตัวกลาง 
                        <strong> ผู้ขายต้องนำของมาส่งและกดยืนยันส่งมอบก่อน คุณจึงจะเห็นปุ่มกดยืนยันรับสินค้า</strong> 
                        เมื่อคุณตรวจสอบของและกดยืนยันแล้ว ระบบจึงจะโอนเงินให้ผู้ขาย
                      </>
                    ) : (
                      <>
                        Your payment is safely held in escrow. 
                        <strong> The seller must deliver and confirm first before your "Confirm Received" button appears.</strong> 
                        Funds are released to seller only after your confirmation.
                      </>
                    )
                  ) : (
                    language === 'TH' ? (
                      <>
                        ผู้ซื้อชำระเงินแล้ว เงินอยู่ในระบบตัวกลาง 
                        <strong> กรุณานำของไปส่งมอบให้ผู้ซื้อตามจุดนัดหมาย แล้วกด "ยืนยันว่าส่งมอบแล้ว"</strong> 
                        เมื่อผู้ซื้อกดยืนยันรับของ <strong>ปุ่ม "กดรับเงิน"</strong> จะปรากฏขึ้นมาให้คุณทันที!
                      </>
                    ) : (
                      <>
                        Buyer has paid into platform escrow. 
                        <strong> Deliver the item and click "Mark as Delivered".</strong> 
                        Once the buyer confirms receipt, the <strong>"Claim Payout"</strong> button will appear for you!
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Order Items List */}
            {ordersLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>กำลังโหลดคำสั่งซื้อ...</div>
            ) : currentOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#fff', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {orderRole === 'buyer' ? '🛍️' : '📦'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>
                  {orderRole === 'buyer' 
                    ? (language === 'TH' ? 'ยังไม่มีประวัติการสั่งซื้อ' : 'No purchases yet') 
                    : (language === 'TH' ? 'ยังไม่มีรายการที่ต้องไปส่งมอบ' : 'No delivery orders yet')}
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
                  {orderRole === 'buyer'
                    ? (language === 'TH' ? 'เลือกดูสินค้าที่น่าสนใจและสั่งซื้อผ่านระบบตัวกลางเพื่อความปลอดภัย' : 'Explore marketplace and purchase items safely.')
                    : (language === 'TH' ? 'เมื่อมีเพื่อนนิสิตสั่งซื้อสินค้าของคุณ รายการที่ต้องไปส่งจะปรากฏขึ้นที่นี่' : 'When someone orders your item, delivery tasks will show here.')}
                </p>
                <Link to={orderRole === 'buyer' ? '/shop' : '/product/create'} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '12px' }}>
                  {orderRole === 'buyer' ? (language === 'TH' ? 'ไปหน้าร้านค้า' : 'Go to Shop') : (language === 'TH' ? 'ลงขายสินค้า' : 'Create Listing')}
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentOrders.map(order => {
                  const badge = getStatusBadge(order.status);
                  const step = getStepProgress(order.status);

                  return (
                    <div key={order.id} className="card escrow-order-card">
                      {/* Card Header */}
                      <div className="escrow-order-header">
                        <div>
                          <span className="escrow-order-number">{order.orderNumber}</span>
                          <span className="escrow-order-date">
                            {new Date(order.createdAt).toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div>
                          <span className={`escrow-status-badge ${badge.class}`}>
                            {badge.text}
                          </span>
                        </div>
                      </div>

                      {/* Escrow Progress Stepper (4 Steps) */}
                      <div className="escrow-stepper">
                        <div className={`stepper-step ${step >= 1 ? 'completed' : ''} ${step === 1 ? 'active' : ''}`}>
                          <div className="stepper-dot">1</div>
                          <div className="stepper-label">{language === 'TH' ? 'ชำระเงิน (ตัวกลางถือเงิน)' : 'Paid (Escrow)'}</div>
                        </div>
                        <div className={`stepper-line ${step >= 2 ? 'completed' : ''}`}></div>
                        
                        <div className={`stepper-step ${step >= 2 ? 'completed' : ''} ${step === 2 ? 'active' : ''}`}>
                          <div className="stepper-dot">2</div>
                          <div className="stepper-label">{language === 'TH' ? 'ผู้ขายส่งมอบสินค้า' : 'Seller Delivered'}</div>
                        </div>
                        <div className={`stepper-line ${step >= 3 ? 'completed' : ''}`}></div>

                        <div className={`stepper-step ${step >= 3 ? 'completed' : ''} ${step === 3 ? 'active' : ''}`}>
                          <div className="stepper-dot">3</div>
                          <div className="stepper-label">{language === 'TH' ? 'ผู้ซื้อยืนยันรับของ' : 'Buyer Received'}</div>
                        </div>
                        <div className={`stepper-line ${step >= 4 ? 'completed' : ''}`}></div>

                        <div className={`stepper-step ${step >= 4 ? 'completed' : ''} ${step === 4 ? 'active' : ''}`}>
                          <div className="stepper-dot">4</div>
                          <div className="stepper-label">{language === 'TH' ? 'โอนเงินให้ผู้ขาย' : 'Payout Released'}</div>
                        </div>
                      </div>

                      {/* Product details & Handover Info */}
                      <div className="escrow-order-body">
                        <div className="escrow-product-info">
                          <img
                            src={order.product?.image || 'https://via.placeholder.com/100x100?text=Product'}
                            alt={order.product?.title || 'Product'}
                            className="escrow-product-img"
                          />
                          <div>
                            <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', color: '#0f172a' }}>
                              {order.product?.title || 'สินค้าในระบบ'}
                            </h4>
                            <div style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                              {language === 'TH' ? 'จำนวน' : 'Quantity'}: {order.quantity} ชิ้น • ฿{Number(order.price).toLocaleString()} / ชิ้น
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem' }}>
                              {language === 'TH' ? 'ยอดเงินรวม' : 'Total'}: ฿{Number(order.totalAmount).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Handover Details (In-person meet details - Connected to Database API) */}
                        <div className="escrow-handover-box">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div className="handover-title" style={{ margin: 0 }}>
                              <Navigation size={16} color="#2563eb" />
                              <span>{language === 'TH' ? 'รายละเอียดการนัดส่ง-รับของ (เชื่อมต่อ Database API)' : 'In-Person Handover Details'}</span>
                            </div>
                            {order.status !== 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  setEditingHandoverOrderId(order.id);
                                  setEditHandoverLocation(order.meetingLocation || order.product?.meetingLocation || '');
                                  setEditHandoverAddress(order.deliveryAddress || '');
                                  setEditHandoverPhone(
                                    (orderRole === 'buyer' ? (order.buyerPhone || order.buyer?.phone) : (order.sellerPhone || order.seller?.phone)) || ''
                                  );
                                }}
                                className="btn-icon"
                                style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem', height: 'auto', width: 'auto', display: 'inline-flex', gap: '0.3rem', color: '#2563eb', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px' }}
                              >
                                <Edit2 size={13} />
                                {language === 'TH' ? 'แก้ไขจุดนัดรับ/เบอร์โทร' : 'Edit Handover'}
                              </button>
                            )}
                          </div>

                          {/* Inline Edit Form for Handover Details via API */}
                          {editingHandoverOrderId === order.id ? (
                            <form onSubmit={(e) => handleSaveHandover(e, order.id)} style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1rem' }}>
                              <div style={{ marginBottom: '0.6rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                  📍 {language === 'TH' ? 'จุดนัดส่งมอบสินค้า:' : 'Meeting Location:'}
                                </label>
                                <input
                                  className="input"
                                  type="text"
                                  value={editHandoverLocation}
                                  onChange={(e) => setEditHandoverLocation(e.target.value)}
                                  required
                                  placeholder={language === 'TH' ? 'เช่น หน้าหอพัก 12, โรงอาหารกลาง' : 'e.g., In front of Dorm 12'}
                                />
                              </div>
                              <div style={{ marginBottom: '0.6rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                  🏠 {language === 'TH' ? 'ที่อยู่ส่งมอบ / หอพักผู้รับ:' : 'Delivery Address:'}
                                </label>
                                <input
                                  className="input"
                                  type="text"
                                  value={editHandoverAddress}
                                  onChange={(e) => setEditHandoverAddress(e.target.value)}
                                  placeholder={language === 'TH' ? 'บ้านเลขที่/ห้องพัก, หอพัก' : 'Room number, dorm'}
                                />
                              </div>
                              <div style={{ marginBottom: '0.8rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                  📞 {language === 'TH' ? 'เบอร์โทรศัพท์ติดต่อของคุณ:' : 'Your Contact Phone:'}
                                </label>
                                <input
                                  className="input"
                                  type="text"
                                  value={editHandoverPhone}
                                  onChange={(e) => setEditHandoverPhone(e.target.value)}
                                  placeholder="08x-xxx-xxxx"
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" disabled={actionLoading === order.id} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                  {actionLoading === order.id ? 'กำลังบันทึก...' : (language === 'TH' ? 'บันทึกข้อมูล' : 'Save')}
                                </button>
                                <button type="button" onClick={() => setEditingHandoverOrderId(null)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                  {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                                </button>
                              </div>
                            </form>
                          ) : null}

                          <div className="handover-row">
                            <span className="handover-label">📍 {language === 'TH' ? 'สถานที่นัดรับ:' : 'Meeting Location:'}</span>
                            <span className="handover-val" style={{ fontWeight: 700, color: '#1e40af' }}>
                              {order.meetingLocation || order.product?.meetingLocation || 'นัดรับตามตกลง'}
                            </span>
                          </div>

                          <div className="handover-row">
                            <span className="handover-label">🏠 {language === 'TH' ? 'ที่อยู่ส่งมอบ/หอพัก:' : 'Delivery Address:'}</span>
                            <span className="handover-val">
                              {order.deliveryAddress || (order.buyer?.addresses?.[0]?.addressText ? `${order.buyer.addresses[0].title} - ${order.buyer.addresses[0].addressText}` : 'นัดพบจุดนัดหมาย')}
                            </span>
                          </div>

                          {/* BOTH SENDER & RECEIVER PROFILE DETAILS FROM DATABASE */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #cbd5e1' }}>
                            {/* ผู้ส่ง (ผู้ขาย / Seller) */}
                            <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>📦 {language === 'TH' ? 'ข้อมูลผู้ส่ง (ผู้ขาย)' : 'Sender (Seller)'}</span>
                                {order.seller?.id === user?.id && <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>คุณ</span>}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                                <div><strong>ชื่อ:</strong> {order.seller?.name || 'ผู้ขาย'}</div>
                                <div>
                                  <strong>เบอร์โทร:</strong>{' '}
                                  <span style={{ fontWeight: 600, color: (order.seller?.phone || order.sellerPhone) ? '#0f172a' : '#dc2626' }}>
                                    {order.seller?.phone || order.sellerPhone || (language === 'TH' ? 'ยังไม่ได้ระบุในโปรไฟล์' : 'Not provided')}
                                  </span>
                                </div>
                                <div><strong>อีเมล:</strong> {order.seller?.email || '-'}</div>
                                <div><strong>รหัสนิสิต:</strong> {order.seller?.studentId || '-'}</div>
                              </div>
                            </div>

                            {/* ผู้รับ (ผู้ซื้อ / Buyer) */}
                            <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>🛍️ {language === 'TH' ? 'ข้อมูลผู้รับ (ผู้ซื้อ)' : 'Receiver (Buyer)'}</span>
                                {order.buyer?.id === user?.id && <span style={{ fontSize: '0.7rem', background: '#f0fdf4', color: '#15803d', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>คุณ</span>}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                                <div><strong>ชื่อ:</strong> {order.buyer?.name || 'ผู้ซื้อ'}</div>
                                <div>
                                  <strong>เบอร์โทร:</strong>{' '}
                                  <span style={{ fontWeight: 600, color: (order.buyer?.phone || order.buyerPhone) ? '#0f172a' : '#dc2626' }}>
                                    {order.buyer?.phone || order.buyerPhone || (language === 'TH' ? 'ยังไม่ได้ระบุในโปรไฟล์' : 'Not provided')}
                                  </span>
                                </div>
                                <div><strong>อีเมล:</strong> {order.buyer?.email || '-'}</div>
                                <div><strong>รหัสนิสิต:</strong> {order.buyer?.studentId || '-'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Action Buttons based on User Requirement */}
                      <div className="escrow-order-footer">
                        {orderRole === 'buyer' ? (
                          /* BUYER VIEW */
                          order.status === 'PAID_ESCROW' ? (
                            <div className="escrow-status-hint pending">
                              <Clock size={20} color="#d97706" />
                              <div>
                                <strong>{language === 'TH' ? 'รอผู้ขายนำสินค้ามาส่งมอบให้คุณ' : 'Waiting for seller delivery'}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                  {language === 'TH' 
                                    ? 'เมื่อคุณพบผู้ขายและผู้ขายกดยืนยันว่าส่งแล้ว ปุ่ม "ยืนยันว่าได้รับสินค้าแล้ว" จะปรากฏขึ้นที่นี่ทันที' 
                                    : 'Once the seller delivers and marks as sent, the "Confirm Received" button will appear here.'}
                                </p>
                              </div>
                            </div>
                          ) : order.status === 'DELIVERED' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                              <div className="escrow-status-hint delivered" style={{ flex: 1 }}>
                                <Truck size={20} color="#2563eb" />
                                <div>
                                  <strong>{language === 'TH' ? 'ผู้ขายแจ้งว่านำสินค้ามาส่งมอบแล้ว!' : 'Seller confirmed delivery!'}</strong>
                                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                    {language === 'TH' ? 'กรุณาตรวจสอบสภาพสินค้า หากถูกต้องเรียบร้อยแล้ว ให้กดยืนยันรับสินค้าด้านขวา' : 'Please verify the product, then confirm receipt to release funds.'}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleConfirmReceive(order.id)}
                                disabled={actionLoading === order.id}
                                className="btn btn-success escrow-action-btn"
                              >
                                <CheckCircle2 size={18} />
                                {actionLoading === order.id ? 'กำลังบันทึก...' : (language === 'TH' ? 'ฉันได้รับสินค้าแล้ว' : 'Confirm Received')}
                              </button>
                            </div>
                          ) : order.status === 'RECEIVED' ? (
                            <div className="escrow-status-hint received">
                              <CheckCircle2 size={20} color="#16a34a" />
                              <div>
                                <strong>{language === 'TH' ? 'คุณได้ยืนยันการรับสินค้าแล้ว' : 'You confirmed receipt'}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                  {language === 'TH' ? 'ระบบเปิดสิทธิ์ให้ผู้ขายกดรับเงินค่าสินค้าเรียบร้อยแล้ว' : 'System unlocked payout claim for the seller.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="escrow-status-hint completed">
                              <CheckCircle2 size={20} color="#059669" />
                              <div>
                                <strong>{language === 'TH' ? '🎉 การซื้อขายเสร็จสมบูรณ์' : '🎉 Order Completed'}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                  {language === 'TH' ? 'ระบบได้โอนเงินให้ผู้ขายเรียบร้อย ขอบคุณที่ใช้บริการ' : 'Payout delivered to seller. Thank you for using DormMart!'}
                                </p>
                              </div>
                            </div>
                          )
                        ) : (
                          /* SELLER VIEW */
                          order.status === 'PAID_ESCROW' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                              <div className="escrow-status-hint pending" style={{ flex: 1 }}>
                                <Clock size={20} color="#d97706" />
                                <div>
                                  <strong>{language === 'TH' ? 'ผู้ซื้อชำระเงินแล้ว (เงินอยู่ในระบบกลาง)' : 'Buyer paid (Held in escrow)'}</strong>
                                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                    {language === 'TH' ? 'กรุณานำสินค้าไปส่งมอบให้ผู้ซื้อตามจุดนัดรับ แล้วกดปุ่มยืนยันส่งมอบ' : 'Deliver the item to the buyer, then confirm delivery below.'}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleConfirmDelivery(order.id)}
                                disabled={actionLoading === order.id}
                                className="btn btn-primary escrow-action-btn"
                              >
                                <Truck size={18} />
                                {actionLoading === order.id ? 'กำลังบันทึก...' : (language === 'TH' ? 'ยืนยันว่าส่งมอบสินค้าแล้ว' : 'Mark as Delivered')}
                              </button>
                            </div>
                          ) : order.status === 'DELIVERED' ? (
                            <div className="escrow-status-hint delivered">
                              <Clock size={20} color="#2563eb" />
                              <div>
                                <strong>{language === 'TH' ? 'คุณยืนยันส่งมอบสินค้าแล้ว — รอผู้ซื้อกดยืนยันรับของ' : 'Delivery marked — Waiting for buyer confirmation'}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                  {language === 'TH' 
                                    ? 'เมื่อผู้ซื้อตรวจเช็คสินค้าและกดยืนยัน ปุ่ม "กดรับเงิน" จะปรากฏขึ้นมาให้คุณทันที' 
                                    : 'Once the buyer confirms receipt, your "Claim Payout" button will appear here.'}
                                </p>
                              </div>
                            </div>
                          ) : order.status === 'RECEIVED' ? (
                            /* Payout button appears after buyer confirmed receipt! */
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                              <div className="escrow-status-hint received" style={{ flex: 1 }}>
                                <CheckCircle2 size={20} color="#16a34a" />
                                <div>
                                  <strong>{language === 'TH' ? 'ผู้ซื้อกดยืนยันรับสินค้าแล้ว! เงินพร้อมโอนให้คุณ' : 'Buyer confirmed receipt! Payout is ready'}</strong>
                                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                    {language === 'TH' ? 'ระบบพร้อมปล่อยเงินค่าสินค้า กดปุ่มด้านขวาเพื่อรับเงินเข้ากระเป๋าของคุณ' : 'Click the button on the right to claim your payout.'}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleClaimPayout(order.id, order.totalAmount)}
                                disabled={actionLoading === order.id}
                                className="btn btn-golden escrow-action-btn"
                              >
                                <DollarSign size={18} />
                                {actionLoading === order.id ? 'กำลังโอนเงิน...' : (language === 'TH' ? `กดรับเงิน (฿${Number(order.totalAmount).toLocaleString()})` : `Claim Payout (฿${Number(order.totalAmount).toLocaleString()})`)}
                              </button>
                            </div>
                          ) : (
                            <div className="escrow-status-hint completed">
                              <CheckCircle2 size={20} color="#059669" />
                              <div>
                                <strong>{language === 'TH' ? `🎉 รับเงินสำเร็จ ฿${Number(order.totalAmount).toLocaleString()}` : `🎉 Payout Received: ฿${Number(order.totalAmount).toLocaleString()}`}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                  {language === 'TH' ? 'ระบบโอนเงินเข้าบัญชีคุณเรียบร้อยแล้ว สินค้าถูกบันทึกเป็นขายแล้ว' : 'Funds transferred to your account. Product marked as sold.'}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'payments':
        return (
          <div className="profile-section animate-fade-in">
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="profile-section-title">{language === 'TH' ? 'ช่องทางการชำระเงิน' : 'Payment Methods'}</h2>
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <Plus size={16} style={{ marginRight: '0.3rem' }} /> {language === 'TH' ? 'เพิ่มช่องทาง' : 'Add Method'}
              </button>
            </div>
            <div className="grid gap-4">
              {mockPayments.map(payment => (
                <div key={payment.id} className="card profile-payment-card flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="payment-icon">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="payment-title">
                        {payment.provider} {payment.type === 'Credit Card' ? `**** ${payment.ending}` : ''}
                        {payment.isDefault && <span className="profile-badge-primary" style={{ marginLeft: '0.5rem' }}>{language === 'TH' ? 'ค่าเริ่มต้น' : 'Default'}</span>}
                      </h3>
                      {payment.type === 'Wallet' && <p className="payment-balance">{language === 'TH' ? 'ยอดเงินคงเหลือ:' : 'Balance:'} ฿{payment.balance}</p>}
                    </div>
                  </div>
                  <button className="btn-icon" aria-label="Edit"><Edit2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'wishlist':
        return (
          <div className="profile-section animate-fade-in">
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{language === 'TH' ? 'รายการโปรด' : 'Wishlist'}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.65rem', borderRadius: '999px' }}>
                    {favorites.length} {language === 'TH' ? 'รายการ' : 'items'}
                  </span>
                </h2>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                  {language === 'TH' ? 'สินค้าที่คุณถูกใจและบันทึกไว้ในระบบ' : 'Listings you saved in your wishlist'}
                </p>
              </div>
              <Link to="/shop" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShoppingBag size={16} />
                {language === 'TH' ? 'ไปหน้าร้านค้า' : 'Browse Shop'}
              </Link>
            </div>

            {favoritesLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                <Clock size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#3b82f6' }} />
                <p>{language === 'TH' ? 'กำลังโหลดรายการโปรดของคุณ...' : 'Loading your wishlist...'}</p>
              </div>
            ) : favorites.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '20px',
                border: '1.5px dashed #cbd5e1'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <Heart size={32} color="#ef4444" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                  {language === 'TH' ? 'ยังไม่มีสินค้าในรายการโปรด' : 'Your wishlist is empty'}
                </h3>
                <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {language === 'TH' 
                    ? 'เมื่อคุณถูกใจสินค้าใด ให้กดปุ่มหัวใจ ❤️ ที่หน้าสินค้า เพื่อบันทึกไว้ดูภายหลังได้ง่ายๆ' 
                    : 'Click the heart icon on any listing to save it here for later.'}
                </p>
                <Link to="/shop" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingBag size={18} />
                  {language === 'TH' ? 'เริ่มเลือกซื้อสินค้า' : 'Explore Market'}
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {favorites.map(item => (
                  <div key={item.id} className="card profile-wishlist-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', background: '#fff' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', height: '200px', background: '#f1f5f9' }}>
                      <Link to={`/product/${item.id}`}>
                        <img 
                          src={item.image || 'https://via.placeholder.com/300x200?text=No+Image'} 
                          alt={item.title} 
                          className="wishlist-image"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Link>
                      
                      {/* Status Tag */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: item.status === 'SOLD' ? '#fee2e2' : item.status === 'RESERVED' ? '#fef3c7' : '#ecfdf5',
                        color: item.status === 'SOLD' ? '#b91c1c' : item.status === 'RESERVED' ? '#92400e' : '#047857',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                      }}>
                        {item.status === 'SOLD' ? (language === 'TH' ? 'ขายแล้ว' : 'Sold') : item.status === 'RESERVED' ? (language === 'TH' ? 'จองแล้ว' : 'Reserved') : (language === 'TH' ? 'พร้อมขาย' : 'Available')}
                      </div>

                      {/* Remove from wishlist button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromWishlist(item.id)}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.94)',
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          color: '#ef4444',
                          transition: 'all 0.2s ease'
                        }}
                        title={language === 'TH' ? 'นำออกจากรายการโปรด' : 'Remove from Wishlist'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="wishlist-info" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                        {item.category || 'General'}
                      </div>
                      
                      <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="wishlist-name" style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </h3>
                      </Link>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="wishlist-price" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f15b2a' }}>
                          ฿{Number(item.price).toLocaleString()}
                        </span>
                        {item.seller && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {language === 'TH' ? 'ผู้ขาย:' : 'Seller:'} {item.seller.name}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: 'auto' }}>
                        <Link 
                          to={`/product/${item.id}`} 
                          className="btn btn-outline" 
                          style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {language === 'TH' ? 'ดูสินค้า' : 'View'}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleAddWishlistToCart(item)}
                          disabled={item.status === 'SOLD'}
                          className="btn btn-primary"
                          style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', opacity: item.status === 'SOLD' ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          <ShoppingBag size={15} />
                          {language === 'TH' ? 'ใส่ตะกร้า' : 'Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>{language === 'TH' ? 'กรุณาเข้าสู่ระบบก่อนดูข้อมูลโปรไฟล์' : 'Please login to view profile'}</h2>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {language === 'TH' ? 'เข้าสู่ระบบ' : 'Login'}
        </Link>
      </div>
    );
  }

  return (
    <div className="market-home">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div className="profile-header">
          <div className="profile-avatar" style={{ overflow: 'hidden' }}>
            {(profileData?.avatar || user?.avatar) ? (
              <img src={profileData?.avatar || user?.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={64} color="#fff" strokeWidth={1.5} />
            )}
          </div>
          <div className="profile-header-info">
            <h1>{profileData?.name || user.name}</h1>
            <p>{profileData?.email || user.email}</p>
          </div>
        </div>

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <nav className="profile-nav">
              <button className={`profile-nav-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => handleTabChange('personal')}>
                <User size={18} /> {language === 'TH' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}
              </button>
              <button className={`profile-nav-btn ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => handleTabChange('addresses')}>
                <MapPin size={18} /> {language === 'TH' ? 'ที่อยู่ในการจัดส่ง' : 'Addresses'}
              </button>
              <button className={`profile-nav-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>
                <Package size={18} /> {language === 'TH' ? 'การนัดรับสินค้า / คำสั่งซื้อ' : 'Handover & Orders'}
              </button>
              <button className={`profile-nav-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => handleTabChange('payments')}>
                <CreditCard size={18} /> {language === 'TH' ? 'ช่องทางการชำระเงิน' : 'Payments'}
              </button>
              <button className={`profile-nav-btn ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => handleTabChange('wishlist')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Heart size={18} /> {language === 'TH' ? 'รายการโปรด' : 'Wishlist'}
                </div>
                {favorites.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#f15b2a', color: 'white', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>
                    {favorites.length}
                  </span>
                )}
              </button>
            </nav>
          </aside>

          <main className="profile-content">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
