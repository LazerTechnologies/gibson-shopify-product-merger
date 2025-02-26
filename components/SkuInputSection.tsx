/** Components **/
import {SkuInput} from "./SkuInput";

interface SkuInputSectionProps {
  skus: string[];
  updateSku: (index: number, value: string) => void;
  removeSku: (index: number) => void;
  addSkuField: () => void;
  fetchProducts: () => Promise<void>;
  isLoading: boolean;
};

export function SkuInputSection({skus, updateSku, removeSku, addSkuField, fetchProducts, isLoading}: SkuInputSectionProps) {
  return (
    <div className="bg-[#161620] p-6 rounded-lg shadow-lg border border-gray-800">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Enter Product SKUs</h2>
      <div className="space-y-4">
        {skus.map((sku, index) => (
          <SkuInput 
            key={index}
            sku={sku}
            index={index}
            updateSku={updateSku}
            removeSku={removeSku}
            disableRemove={skus.length === 1}
          />
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={addSkuField}
          className="px-4 py-2 bg-[#1e1e2a] text-gray-200 rounded border border-gray-700 hover:bg-[#252535] transition-colors"
        >
          Add Another SKU
        </button>
        <button
          onClick={fetchProducts}
          disabled={isLoading}
          className="px-4 py-2 bg-[#2a3a42] text-gray-100 rounded hover:bg-[#2d4450] transition-colors disabled:opacity-50 border border-teal-900"
        >
          {isLoading ? 'Loading...' : 'Fetch Products'}
        </button>
      </div>
    </div>
  );
};