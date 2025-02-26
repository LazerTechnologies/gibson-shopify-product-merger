import Image from "next/image";

interface ProductMainDataProps {
  editedProductData: Record<string, unknown>;
  handleProductDataChange: (field: 'title' | 'vendor' | 'productType', value: string) => void;
  firstImage: string | undefined;
};

export function ProductMainData({
  editedProductData, 
  handleProductDataChange, 
  firstImage
}: ProductMainDataProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="inline-block h-[100px] w-[100px] relative border border-gray-800 rounded-[5px] overflow-hidden p-1">
        {firstImage && (
          <Image
            src={firstImage}
            alt="Product Image"
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-col">
          <label htmlFor="productTitle" className="text-xs text-gray-400 mb-1">Title</label>
          <input
            id="productTitle"
            type="text"
            value={editedProductData?.title as string || ''}
            onChange={(e) => handleProductDataChange('title', e.target.value)}
            className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-lg text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="productVendor" className="text-xs text-gray-400 mb-1">Vendor</label>
          <input
            id="productVendor"
            type="text"
            value={editedProductData?.vendor as string || ''}
            onChange={(e) => handleProductDataChange('vendor', e.target.value)}
            className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="productType" className="text-xs text-gray-400 mb-1">Type</label>
          <input
            id="productType"
            type="text"
            value={editedProductData?.productType as string || ''}
            onChange={(e) => handleProductDataChange('productType', e.target.value)}
            className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  );
};