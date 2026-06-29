'use client';

import { usePosStore } from '@/lib/store/usePosStore';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    categories?: { name: string };
    units?: { name: string };
    stock?: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = usePosStore();

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div 
      onClick={handleAdd}
      className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between active:scale-[0.99] group"
    >
      <div className="flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">{product.name}</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
            {product.categories?.name || 'Uncategorized'}
          </span>
          <span className="text-sm text-slate-500">
            Sisa Stok: <strong className="text-slate-700">{product.stock || 0}</strong> {product.units?.name || ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-blue-600 font-bold text-xl">{formatPrice(product.price)}</p>
        <button className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
