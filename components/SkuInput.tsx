interface SkuInputProps {
  sku: string;
  index: number;
  updateSku: (index: number, value: string) => void;
  removeSku: (index: number) => void;
  disableRemove: boolean;
};

export function SkuInput({
  sku, 
  index, 
  updateSku, 
  removeSku, 
  disableRemove
}: SkuInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={sku}
        onChange={(e) => updateSku(index, e.target.value)}
        placeholder="Enter SKU"
        className="flex-1 bg-[#1e1e2a] text-gray-200 px-4 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent"
      />
      <button
        onClick={() => removeSku(index)}
        className="p-2 bg-[#1e1e2a] text-gray-400 hover:text-red-400 rounded border border-gray-700"
        disabled={disableRemove}
      >
        Remove
      </button>
    </div>
  );
};