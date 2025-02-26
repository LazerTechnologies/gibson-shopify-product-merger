import Image from "next/image";

/** Types **/
import type {ProductVariantInfo} from "@/lib/types";

interface VariantsTableProps {
  variants: ProductVariantInfo[] | undefined;
}

export function VariantsTable({variants}: VariantsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-[#1a1a25]">
          <tr>
            <th scope="col" className="px-4 py-3 rounded-tl-lg">Image</th>
            <th scope="col" className="px-4 py-3">Variant</th>
            <th scope="col" className="px-4 py-3">Size</th>
            <th scope="col" className="px-4 py-3">Color</th>
            <th scope="col" className="px-4 py-3">SKU</th>
            <th scope="col" className="px-4 py-3">Price</th>
            <th scope="col" className="px-4 py-3 rounded-tr-lg">Inventory</th>
          </tr>
        </thead>
        <tbody>
          {variants?.map((variant, variantIndex) => (
            <tr 
              key={`variant-${variantIndex}`}
              className={`border-b border-gray-800 ${variantIndex % 2 === 0 ? 'bg-[#1e1e2a]' : 'bg-[#1a1a25]'}`}
            >
              <td className="px-4 py-3 w-16">
                {variant?.imageUrl && (
                  <div className="h-10 w-10 relative rounded overflow-hidden">
                    <Image
                      src={variant.imageUrl}
                      alt={variant?.title || ''}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-medium">{variant?.title}</td>
              <td className="px-4 py-3">{variant?.size}</td>
              <td className="px-4 py-3">{variant?.color}</td>
              <td className="px-4 py-3">{variant?.sku}</td>
              <td className="px-4 py-3">${variant?.price}</td>
              <td className="px-4 py-3">{variant?.inventoryQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}