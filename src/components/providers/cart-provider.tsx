"use client"

import { createContext, useContext, useState, useEffect } from 'react'

export type CartItem = {
  product_id: string
  name: string
  price: number
  quantity: number
  stock: number
  supplier_name: string
  image_url?: string
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
})

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pasar_solidaritas_cart')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse cart", e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('pasar_solidaritas_cart', JSON.stringify(items))
    }
  }, [items, isLoaded])

  const addItem = (newItem: CartItem) => {
    setItems((current) => {
      const existing = current.find(item => item.product_id === newItem.product_id)
      if (existing) {
        // Check stock limit
        const newQuantity = Math.min(existing.quantity + newItem.quantity, newItem.stock)
        return current.map(item => 
          item.product_id === newItem.product_id 
            ? { ...item, quantity: newQuantity }
            : item
        )
      }
      return [...current, newItem]
    })
  }

  const removeItem = (productId: string) => {
    setItems((current) => current.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((current) => 
      current.map(item => {
        if (item.product_id === productId) {
          const validQuantity = Math.max(1, Math.min(quantity, item.stock))
          return { ...item, quantity: validQuantity }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
