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
    rawStockInfo?: string;
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
      maxStock: product.stock || 0,
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
      className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 active:scale-[0.99] group"
    >
      <div className="flex flex-col w-full sm:w-auto">
        <h3 className="font-bold text-slate-800 text-base sm:text-lg group-hover:text-blue-700 transition-colors leading-tight">{product.name}</h3>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 mt-1 sm:mt-2">
          <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
            {product.categories?.name || 'Uncategorized'}
          </span>
          <span className="text-xs sm:text-sm text-slate-500">
            Stok: <strong className="text-slate-700">{product.stock || 0}</strong> {product.units?.name || ''}
            {product.rawStockInfo && (
              <span className="text-slate-400 ml-1 font-normal">
                {product.rawStockInfo}
              </span>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
        <p className="text-blue-600 font-bold text-lg sm:text-xl">{formatPrice(product.price)}</p>
        <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 sm:bg-slate-100 text-blue-600 sm:text-slate-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
          <Plus size={18} className="sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
