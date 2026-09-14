import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { parseApiResponse } from '../utils/api';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const productsRequestRef = useRef(null);

  const fetchProducts = useCallback(async (search = '', category = 'All', minPrice = '', maxPrice = '') => {
    productsRequestRef.current?.abort();
    const controller = new AbortController();
    productsRequestRef.current = controller;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category && category !== 'All') params.set('category', category);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const res = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal });
      const data = await parseApiResponse(res, []);
      if (productsRequestRef.current === controller) {
        setProducts(data);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Product fetch error:', error);
      if (productsRequestRef.current === controller) {
        setProducts([]);
      }
    } finally {
      if (productsRequestRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMyProducts = async (token) => {
    const res = await fetch('/api/products/mine', { headers: { Authorization: `Bearer ${token}` } });
    return parseApiResponse(res, []);
  };

  const fetchRecommendations = useCallback(async (id) => {
    const res = await fetch(`/api/products/${id}/recommendations`);
    return parseApiResponse(res, []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    return parseApiResponse(res, []);
  }, []);

  const requestCategory = async (name, token) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    return parseApiResponse(res);
  };

  const fetchPendingCategories = async (token) => {
    const res = await fetch('/api/categories/pending', { headers: { Authorization: `Bearer ${token}` } });
    return parseApiResponse(res, []);
  };

  const approveCategory = async (id, token) => {
    const res = await fetch(`/api/categories/${id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    return parseApiResponse(res);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fetchProducts(params.get('search') || '', params.get('category') || 'All');
  }, [fetchProducts]);

  const addProduct = async (product, token) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });

    const data = await parseApiResponse(res);

    setProducts(prev => [data, ...prev]);
    return data;
  };

  const updateProduct = async (id, updatedProduct, token) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatedProduct)
    });

    const data = await parseApiResponse(res);

    setProducts(prev => prev.map(product => product.id === parseInt(id) ? data : product));
    return data;
  };

  const deleteProduct = async (id, token) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await parseApiResponse(res);

    setProducts(prev => prev.filter(product => product.id !== parseInt(id)));
    return data;
  };

  return (
    <ProductContext.Provider value={{ products, loading, fetchProducts, fetchMyProducts, fetchRecommendations, fetchCategories, requestCategory, fetchPendingCategories, approveCategory, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductContext.Provider>
  );
};
