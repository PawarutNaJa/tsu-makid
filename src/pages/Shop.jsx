import React, { useState, useContext, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Search } from 'lucide-react';
import { ProductContext } from '../context/ProductContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

const Shop = () => {
  const { products, fetchProducts, fetchCategories, requestCategory, loading } = useContext(ProductContext);
  const { language } = useContext(LanguageContext);
  const { user, token } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState(['All', 'Electronics', 'Furniture', 'Dorm Essentials', 'Books', 'Clothes', 'Others']);

  const initialCategory = (() => {
    const categoryFromUrl = searchParams.get('category');
    return categories.includes(categoryFromUrl) ? categoryFromUrl : 'All';
  })();

  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');

  useEffect(() => {
    fetchCategories().then(items => setCategories(['All', ...items.filter(item => item !== 'All')])).catch(() => {});
  }, [fetchCategories]);

  useEffect(() => {
    setFilter(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    fetchProducts(search, filter, minPrice, maxPrice);
  }, [search, filter, minPrice, maxPrice, fetchProducts]);

  const handleCategoryRequest = async (event) => {
    event.preventDefault();
    if (!newCategory.trim() || !user) return;
    try {
      const result = await requestCategory(newCategory.trim(), token);
      setCategoryMessage(result.message || (language === 'TH' ? 'ส่งคำขอแล้ว' : 'Request submitted'));
      setNewCategory('');
    } catch (error) {
      setCategoryMessage(error.message);
    }
  };

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    const nextParams = {};
    if (search.trim()) nextParams.search = search.trim();
    if (nextFilter !== 'All') nextParams.category = nextFilter;
    setSearchParams(nextParams);
  };

  return (
    <div className="animate-fade-in section">
      <div className="container">
        <h1 style={{ marginBottom: '2rem' }}>
          {language === 'TH' ? 'สินค้าทั้งหมด' : 'Shop Collection'}
        </h1>

        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', background: 'white', borderRadius: '4px', border: '1px solid #ccc', maxWidth: '400px', padding: '0 0.5rem' }}>
          <Search size={20} color="#666" />
          <input
            type="text"
            placeholder={language === 'TH' ? 'ค้นหาสินค้า...' : 'Search products...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', border: 'none', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <span>{language === 'TH' ? 'ช่วงราคา' : 'Price range'}:</span>
          <input type="number" min="0" placeholder={language === 'TH' ? 'ต่ำสุด' : 'Min'} value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: '110px', padding: '0.55rem' }} />
          <input type="number" min="0" placeholder={language === 'TH' ? 'สูงสุด' : 'Max'} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: '110px', padding: '0.55rem' }} />
        </div>

        <div className="flex gap-4" style={{ marginBottom: '3rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {categories.map(category => (
            <button
              key={category}
              className={`btn ${filter === category ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleFilterChange(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {user && (
          <form onSubmit={handleCategoryRequest} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder={language === 'TH' ? 'เสนอหมวดหมู่ใหม่' : 'Suggest a category'} style={{ padding: '0.65rem', minWidth: '220px' }} />
            <button type="submit" className="btn btn-outline">{language === 'TH' ? 'ส่งคำขอ' : 'Suggest'}</button>
            {categoryMessage && <span style={{ color: '#475569' }}>{categoryMessage}</span>}
          </form>
        )}

        {loading ? (
          <p>{language === 'TH' ? 'กำลังโหลดสินค้า...' : 'Loading products...'}</p>
        ) : products.length === 0 ? (
          <p>{language === 'TH' ? 'ไม่พบสินค้า' : 'No products found.'}</p>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
