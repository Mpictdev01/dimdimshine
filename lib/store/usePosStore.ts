import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Record<string, string>;
}

export interface ShiftInfo {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  startingCash: number;
}

interface PosState {
  cart: CartItem[];
  currentShift: ShiftInfo | null;
  activeTable: string | null;
  orderType: 'dine_in' | 'takeaway';
  
  // Actions
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setShift: (shift: ShiftInfo) => void;
  endShift: () => void;
  setActiveTable: (table: string | null) => void;
  setOrderType: (type: 'dine_in' | 'takeaway') => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      cart: [],
      currentShift: null,
      activeTable: null,
      orderType: 'dine_in',

      addToCart: (item) => set((state) => {
        const existingItem = state.cart.find(
          (i) => i.productId === item.productId && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
        );
        if (existingItem) {
          return {
            cart: state.cart.map((i) =>
              i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          };
        }
        return { cart: [...state.cart, { ...item, id: crypto.randomUUID() }] };
      }),

      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter((i) => i.id !== id),
      })),

      updateQuantity: (id, quantity) => set((state) => ({
        cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
      })),

      clearCart: () => set({ cart: [] }),
      
      setShift: (shift) => set({ currentShift: shift }),
      
      endShift: () => set({ currentShift: null }),
      
      setActiveTable: (table) => set({ activeTable: table }),
      
      setOrderType: (type) => set({ orderType: type }),
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
