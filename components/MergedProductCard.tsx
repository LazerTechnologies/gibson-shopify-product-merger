/** Types **/
import type {GetMergeProductsResponse, ProductOption} from "@/lib/types";

/** Components **/
import {
  AlertMessage,
  ProductMainData,
  ProductOptions,
  VariantsTable
} from "@/components";

interface MergedProductCardProps {
  products: GetMergeProductsResponse;
  isMerging: boolean;
  handleMergeProducts: () => Promise<void>;
  mergeSuccess: boolean | null;
  editedProductData: Record<string, unknown>;
  handleProductDataChange: (field: 'title' | 'vendor' | 'productType', value: string) => void;
  handleOptionNameChange: (optionIndex: number, value: string) => void;
  handleOptionValueChange: (optionIndex: number, valueIndex: number, value: string) => void;
}

export function MergedProductCard({
  products, 
  isMerging, 
  handleMergeProducts, 
  mergeSuccess, 
  editedProductData, 
  handleProductDataChange, 
  handleOptionNameChange, 
  handleOptionValueChange
}: MergedProductCardProps) {
  const firstProduct = products?.products[0];
  const firstImage = firstProduct?.featuredMedia?.preview?.image?.url || firstProduct?.media?.edges?.[0]?.node?.image?.url;
  
  return (
    <div className="bg-[#161620] p-6 rounded-lg shadow-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Products Found: {products?.count}</h2>
        <button
          onClick={handleMergeProducts}
          disabled={isMerging}
          className="px-4 py-2 bg-teal-800 text-gray-100 rounded hover:bg-teal-700 transition-colors disabled:opacity-50 border border-teal-900"
        >
          {isMerging ? 'Merging...' : 'Merge Selected Products'}
        </button>
      </div>
      
      <AlertMessage 
        success={mergeSuccess} 
        successMessage="Products merged successfully!" 
        errorMessage="Failed to merge products. Please try again."
      />
      
      <div className="p-4">
        <ProductMainData 
          editedProductData={editedProductData} 
          handleProductDataChange={handleProductDataChange} 
          firstImage={firstImage}
        />
        
        <div className="mt-6 border-t border-gray-800 pt-4">
          <h3 className="text-lg font-medium text-gray-200 mb-4">Product Variants</h3>
          
          {(editedProductData?.options as ProductOption[])?.map((option, optionIndex) => (
            <ProductOptions
              key={`option-${optionIndex}`}
              option={option}
              optionIndex={optionIndex}
              handleOptionNameChange={handleOptionNameChange}
              handleOptionValueChange={handleOptionValueChange}
            />
          ))}
          
          <VariantsTable variants={firstProduct?.variants} />
        </div>
      </div>
    </div>
  );
};