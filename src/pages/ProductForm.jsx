import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ProductContext } from '../context/ProductContext';
import { useNavigate, useParams } from 'react-router-dom';

const ProductForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { token } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const { products, addProduct, updateProduct, fetchCategories } = useContext(ProductContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Electronics',
    condition: 'New',
    status: 'AVAILABLE',
    image: '',
    meetingLocation: ''
  });
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [categories, setCategories] = useState(['Electronics', 'Furniture', 'Dorm Essentials', 'Books', 'Clothes', 'Others']);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, [fetchCategories]);

  useEffect(() => {
    if (isEditMode) {
      const p = products.find(prod => prod.id === parseInt(id));
      if (p) {
        setFormData({
          title: p.title || '',
          description: p.description || '',
          price: p.price || '',
          category: p.category || 'Electronics',
          condition: p.condition || 'New',
          status: p.status || 'AVAILABLE',
          image: p.image || '',
          meetingLocation: p.meetingLocation || ''
        });
        setPreviewImage(p.image || '');
      }
    }
  }, [id, isEditMode, products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'image') {
      setPreviewImage(value);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(language === 'TH' ? 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP' : 'Only JPG, PNG, and WebP files are supported');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(language === 'TH' ? 'รูปภาพต้องมีขนาดไม่เกิน 2 MB' : 'Image must be 2 MB or smaller');
      e.target.value = '';
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setPreviewImage(result);
      setFormData(prev => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        setError(language === 'TH' ? 'กรุณาเข้าสู่ระบบก่อนลงขายสินค้า' : 'Please log in before listing a product');
        return;
      }

      if (Number(formData.price) < 0 || !Number.isFinite(Number(formData.price))) {
        setError(language === 'TH' ? 'ราคาต้องเป็นตัวเลขและไม่ติดลบ' : 'Price must be a non-negative number');
        return;
      }

      if (isEditMode) {
        await updateProduct(id, formData, token);
      } else {
        await addProduct(formData, token);
      }
      navigate('/my-products');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>
        {isEditMode 
          ? (language === 'TH' ? 'แก้ไขสินค้า' : 'Edit Product') 
          : (language === 'TH' ? 'ลงขายสินค้า' : 'Create Listing')}
      </h2>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            {language === 'TH' ? 'หัวข้อ *' : 'Title *'}
          </label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            {language === 'TH' ? 'รายละเอียด *' : 'Description *'}
          </label>
          <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              {language === 'TH' ? 'ราคา (฿) *' : 'Price (฿) *'}
            </label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              {language === 'TH' ? 'หมวดหมู่ *' : 'Category *'}
            </label>
            <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            {language === 'TH' ? 'สถานะสินค้า' : 'Listing status'}
          </label>
          <select name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="AVAILABLE">{language === 'TH' ? 'พร้อมขาย' : 'Available'}</option>
            <option value="RESERVED">{language === 'TH' ? 'จองแล้ว' : 'Reserved'}</option>
            <option value="SOLD">{language === 'TH' ? 'ขายแล้ว' : 'Sold'}</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              {language === 'TH' ? 'สภาพ *' : 'Condition *'}
            </label>
            <select name="condition" value={formData.condition} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              {language === 'TH' ? 'สถานที่นัดรับ *' : 'Meeting Location *'}
            </label>
            <input type="text" name="meetingLocation" value={formData.meetingLocation} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            {language === 'TH' ? 'รูปภาพสินค้า' : 'Product image'}
          </label>

          <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '1rem', background: '#f8fafc' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              style={{ display: 'block', width: '100%', marginBottom: '0.75rem' }}
            />

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
              {language === 'TH' ? 'หรือวางลิงก์รูปภาพด้านล่าง' : 'or paste an image URL below'}
            </div>

            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          {previewImage && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={previewImage}
                alt="Preview"
                style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
            {isEditMode 
              ? (language === 'TH' ? 'บันทึกการแก้ไข' : 'Update Product') 
              : (language === 'TH' ? 'สร้างประกาศ' : 'Create Listing')}
          </button>
          <button type="button" onClick={() => navigate('/my-products')} className="btn" style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6' }}>
            {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
