import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
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
  activeCustomer: { id: string, name: string } | null;
  orderType: 'delivery' | 'pickup';
  notes: string;
  
  // Actions
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setShift: (shift: ShiftInfo) => void;
  endShift: () => void;
  setActiveCustomer: (customer: { id: string, name: string } | null) => void;
  setOrderType: (type: 'delivery' | 'pickup') => void;
  setNotes: (notes: string) => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      cart: [],
      currentShift: null,
      activeCustomer: null,
      orderType: 'delivery',
      notes: '',

      addToCart: (item) => set((state) => {
        const existingItem = state.cart.find(
          (i) => i.productId === item.productId
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

      clearCart: () => set({ cart: [], activeCustomer: null, notes: '', orderType: 'delivery' }),
      
      setShift: (shift) => set({ currentShift: shift }),
      
      endShift: () => set({ currentShift: null }),
      
      setActiveCustomer: (customer) => set({ activeCustomer: customer }),
      
      setOrderType: (type) => set({ orderType: type }),

      setNotes: (notes) => set({ notes }),
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
