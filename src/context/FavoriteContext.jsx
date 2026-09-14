import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { parseApiResponse } from '../utils/api';

export const FavoriteContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoriteProvider');
  }
  return context;
};

export const FavoriteProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // ดึงรายการ Favorite IDs (สำหรับปุ่มหัวใจในหน้าการ์ด/หน้ารายละเอียด)
  const fetchFavoriteIds = useCallback(async () => {
    if (!token) {
      setFavoriteIds([]);
      return;
    }
    try {
      const res = await fetch('/api/favorites/ids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ids = await parseApiResponse(res, []);
      if (Array.isArray(ids)) {
        setFavoriteIds(ids);
      }
    } catch (err) {
      console.error('Error fetching favorite IDs:', err);
    }
  }, [token]);

  // ดึงรายการโปรดทั้งหมดพร้อมข้อมูลสินค้า (สำหรับแท็บ Wishlist ใน Profile)
  const fetchFavorites = useCallback(async () => {
    if (!token) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res, []);
      if (Array.isArray(data)) {
        setFavorites(data);
        setFavoriteIds(data.map(item => item.id));
      }
    } catch (err) {
      console.error('Error fetching full favorites list:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ซิงค์ข้อมูลเมื่อสถานะ Auth เปลี่ยน
  useEffect(() => {
    if (token) {
      fetchFavoriteIds();
      fetchFavorites();
    } else {
      setFavoriteIds([]);
      setFavorites([]);
    }
  }, [token, fetchFavoriteIds, fetchFavorites]);

  // ตรวจสอบว่าสินค้าเป็นรายการโปรดหรือไม่
  const isFavorite = useCallback((productId) => {
    if (!productId) return false;
    return favoriteIds.includes(Number(productId));
  }, [favoriteIds]);

  // สลับสถานะ Favorite (Toggle) พร้อม Optimistic UI
  const toggleFavorite = async (productOrId) => {
    if (!token) {
      return { success: false, needLogin: true, message: 'กรุณาเข้าสู่ระบบก่อนบันทึกรายการโปรด' };
    }

    const productId = typeof productOrId === 'object' ? Number(productOrId.id) : Number(productOrId);
    if (!productId) return { success: false, message: 'Invalid product ID' };

    const wasFavorited = favoriteIds.includes(productId);

    // 1. Optimistic update ทันที
    setFavoriteIds(prev => 
      wasFavorited ? prev.filter(id => id !== productId) : [...prev, productId]
    );

    if (wasFavorited) {
      setFavorites(prev => prev.filter(item => item.id !== productId));
    }

    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      const result = await parseApiResponse(res);

      if (result.favorited) {
        fetchFavorites();
      }

      return {
        success: true,
        favorited: result.favorited,
        message: result.message
      };
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Rollback optimistic update
      setFavoriteIds(prev => 
        wasFavorited ? [...prev, productId] : prev.filter(id => id !== productId)
      );
      return {
        success: false,
        message: err.message || 'ไม่สามารถบันทึกรายการโปรดได้'
      };
    }
  };

  // ลบออกจากรายการโปรดโดยตรง
  const removeFavorite = async (productId) => {
    if (!token) return;
    const numId = Number(productId);

    // Optimistic
    setFavoriteIds(prev => prev.filter(id => id !== numId));
    setFavorites(prev => prev.filter(item => item.id !== numId));

    try {
      const res = await fetch(`/api/favorites/${numId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await parseApiResponse(res);
    } catch (err) {
      console.error('Error removing favorite:', err);
      fetchFavorites();
    }
  };

  return (
    <FavoriteContext.Provider
      value={{
        favoriteIds,
        favorites,
        loading,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        fetchFavorites,
        fetchFavoriteIds
      }}
    >
      {children}
    </FavoriteContext.Provider>
  );
};
