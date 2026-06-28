'use client';

import { usePosStore } from '@/lib/store/usePosStore';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    category: string;
    image_url?: string;
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
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all flex flex-col h-full active:scale-95"
    >
      <div className="h-32 bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl">☕</div> // Placeholder icon
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <h3 className="font-semibold text-slate-800 line-clamp-2">{product.name}</h3>
        <p className="text-blue-600 font-bold mt-2">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}
