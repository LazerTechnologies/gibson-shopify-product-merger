import Image from "next/image";

/** Types **/
import type {GetMergeProductsResponse, MergeProduct} from "@/lib/types";

/** Components **/
import {OriginalProductVariantsTable} from "@/components";

interface ProductSummaryCardProps {
  product: MergeProduct;
  handleDeleteProduct: (productIds: string[]) => Promise<void>;
  products: GetMergeProductsResponse;
  isDeleting: boolean;
};

export function ProductSummaryCard({product, handleDeleteProduct, products, isDeleting}: ProductSummaryCardProps) {
  return (
    <div>
      <div className="p-4 bg-[#1a1a25] rounded-lg border border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 relative rounded overflow-hidden">
              {product?.featuredMedia?.preview?.image?.url && (
                <Image
                  src={product?.featuredMedia?.preview?.image?.url}
                  alt={product?.title || ''}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-200">{product?.title}</h3>
              <p className="text-sm text-gray-400">
                {product?.variants?.length || 0} variants • {product?.vendor}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => 
                handleDeleteProduct(products?.originalProducts?.map(
                  (product) => product?.id)
                )
              }
              disabled={isDeleting}
              className="px-3 py-1 bg-red-900/30 text-red-300 rounded hover:bg-red-800/40 transition-colors border border-red-900"
            >
              {isDeleting ? 'Deleting...' : 'Delete All Old Variants'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-2 p-4 bg-[#1e1e2a] rounded-lg border border-gray-800">
        <h4 className="text-md font-medium text-gray-200 mb-3">Original Products</h4>
        <OriginalProductVariantsTable variants={product?.variants} isDeleting={isDeleting} />
      </div>
    </div>
  );
}