/** Types **/
import type {ProductVariantInfo} from "@/lib/types";

interface OriginalProductVariantsTableProps {
  variants: ProductVariantInfo[] | undefined;
  isDeleting: boolean;
}

export function OriginalProductVariantsTable({variants}: OriginalProductVariantsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-[#161620]">
          <tr>
            <th scope="col" className="px-3 py-2">Variant</th>
            <th scope="col" className="px-3 py-2">SKU</th>
            <th scope="col" className="px-3 py-2">Price</th>
            <th scope="col" className="px-3 py-2">Inventory</th>
            <th scope="col" className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants?.map((variant, variantIndex) => (
            <tr 
              key={`variant-${variantIndex}`}
              className="border-b border-gray-800"
            >
              <td className="px-3 py-2 font-medium">{variant?.title}</td>
              <td className="px-3 py-2">{variant?.sku}</td>
              <td className="px-3 py-2">${variant?.price}</td>
              <td className="px-3 py-2">{variant?.inventoryQuantity}</td>
              <td className="px-3 py-2">
                <button
                  className="px-2 py-1 bg-red-900/30 text-red-300 rounded hover:bg-red-800/40 transition-colors border border-red-900 text-xs"
                >
                  Delete Variant
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}