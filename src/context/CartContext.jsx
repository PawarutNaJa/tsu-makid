import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { parseApiResponse } from '../utils/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('tsu-market-guest-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const previousUserRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (!user || !token) {
      if (previousUserRef.current) {
        localStorage.removeItem('tsu-market-guest-cart');
      }
      setCartItems([]);
      previousUserRef.current = null;
      return () => { active = false; };
    }

    fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => parseApiResponse(response, []))
      .then(items => {
        if (active) setCartItems(items);
      })
      .catch(error => {
        if (active) {
          console.error('Cart fetch error:', error);
          setCartItems([]);
        }
      });

    previousUserRef.current = user;

    return () => { active = false; };
  }, [user, token]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('tsu-market-guest-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = async (product, quantity = 1) => {
    if (!user || !token) {
      setCartItems(previous => {
        const existing = previous.find(current => current.id === product.id);
        return existing
          ? previous.map(current => current.id === product.id ? { ...current, quantity: current.quantity + quantity } : current)
          : [...previous, { ...product, quantity }];
      });
      return product;
    }
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, quantity })
    });
    const item = await parseApiResponse(response);
    setCartItems(previous => {
      const existing = previous.find(current => current.id === item.id);
      return existing
        ? previous.map(current => current.id === item.id ? item : current)
        : [...previous, item];
    });
    return item;
  };

  const removeFromCart = async (productId) => {
    if (!user || !token) {
      setCartItems(previous => previous.filter(item => item.id !== productId));
      return;
    }
    const response = await fetch(`/api/cart/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await parseApiResponse(response);
    setCartItems(previous => previous.filter(item => item.id !== productId));
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (!user || !token) {
      setCartItems(previous => previous.map(item => item.id === productId ? { ...item, quantity } : item));
      return;
    }

    const response = await fetch(`/api/cart/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity })
    });
    const item = await parseApiResponse(response);
    setCartItems(previous => previous.map(current => current.id === productId ? item : current));
  };

  const clearCart = async () => {
    if (!user || !token) {
      setCartItems([]);
      return;
    }
    const response = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await parseApiResponse(response);
    setCartItems([]);
  };

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity), 0),
    [cartItems]
  );

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
    }}>
      {children}
    </CartContext.Provider>
  );
};
