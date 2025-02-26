/** Components **/
import {AlertMessage, ProductSummaryCard} from "@/components";

/** Types **/
import type {GetMergeProductsResponse} from "@/lib/types";

interface OriginalProductsCardProps {
  products: GetMergeProductsResponse;
  deleteSuccess: boolean | null;
  isDeleting: boolean;
  handleDeleteProduct: (productIds: string[]) => Promise<void>;
};

export function OriginalProductsCard({
  products, 
  deleteSuccess, 
  isDeleting, 
  handleDeleteProduct
}: OriginalProductsCardProps) {
  return (
    <div className="bg-[#161620] p-6 rounded-lg shadow-lg border border-gray-800">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Original Products</h2>
      
      <AlertMessage 
        success={deleteSuccess} 
        successMessage="Product deleted successfully!" 
        errorMessage="Failed to delete product. Please try again."
      />
      
      <div className="space-y-4">
        {products?.products?.map((product, index) => (
          <ProductSummaryCard 
            key={`original-product-${index}`}
            product={product}
            handleDeleteProduct={handleDeleteProduct}
            products={products}
            isDeleting={isDeleting}
          />
        ))}
      </div>
    </div>
  );
}