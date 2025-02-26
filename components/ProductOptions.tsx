/** Types **/
import type {ProductOption} from "@/lib/types";

interface ProductOptionProps {
  option: ProductOption;
  optionIndex: number;
  handleOptionNameChange: (optionIndex: number, value: string) => void;
  handleOptionValueChange: (optionIndex: number, valueIndex: number, value: string) => void;
};

export function ProductOptions({option, optionIndex, handleOptionNameChange, handleOptionValueChange}: ProductOptionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <input
          type="text"
          value={option?.name || ''}
          onChange={(e) => handleOptionNameChange(optionIndex, e.target.value)}
          className="text-md font-medium text-gray-300 bg-transparent border-b border-gray-700 focus:border-teal-700 focus:outline-none px-1"
        />
        <span className="ml-2 text-xs text-gray-500">({option?.values?.length || 0} values)</span>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {option?.values?.map((value, valueIndex) => (
          <input
            key={`${option.name}-${valueIndex}`}
            type="text"
            value={value || ''}
            onChange={(e) => handleOptionValueChange(optionIndex, valueIndex, e.target.value)}
            className="px-3 py-1 bg-[#1e1e2a] text-gray-300 rounded-full border border-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        ))}
      </div>
    </div>
  );
};