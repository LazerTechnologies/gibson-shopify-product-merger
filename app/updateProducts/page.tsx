"use client";
import {useState} from "react";

/** Types **/
import type {ProductNode} from "@/lib/types/ShopifyData";

interface ProductsResponse {
  mergedProducts: ProductNode[];
}

export default function UpdateProducts() {
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openStates, setOpenStates] = useState<{[key: number]: boolean}>({});

  async function loadProducts() {
    console.log("Starting to load products...");
    setIsLoading(true);
    try {
      const res = await fetch("/api/products/getMergeProducts");
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status}`);
      };

      const data = await res.json();
      console.log("Received data:", data);
      setProducts(data);
      
      if (data?.mergedProducts) {
        const initialOpenStates = data.mergedProducts.reduce((
          acc: {[key: number]: boolean},
          _: ProductNode,
          index: number
        ) => {
          acc[index] = true;
          return acc;
        }, {});
        setOpenStates(initialOpenStates);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  async function updateProducts() {
    console.log("Updating products...");
    setIsLoading(true);
    try {
      console.log("Products to update:", products?.mergedProducts);
    } catch (error) {
      console.error("Error updating products:", error);
    } finally {
      setIsLoading(false);
    };
  };

  return (
    <div className="min-h-screen p-8 bg-[#0a0a0a]">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            Products To Update
          </h1>
          {products ? (
            <button
              onClick={updateProducts}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              Update Products
            </button>
          ): (
            <button
              onClick={loadProducts}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "Load Products"}
            </button>
          )}
        </div>
        {products && (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-white">
              Merged Products ({products.mergedProducts.length})
            </h2>
            {products.mergedProducts.map((product, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-4 bg-[#1a1a1a]">
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => setOpenStates(prev => ({...prev, [index]: !prev[index]}))}
                >
                  <div className="flex flex-col gap-[8px]">
                    <h3 className="text-xl font-medium text-white">
                      {product.title || "Untitled Product"}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-400">
                        <p className="font-medium mb-[5px]">
                          Vendor: {product.vendor}
                        </p>
                        <p className="font-medium">
                          Type: {product.productType}
                        </p>
                      </div>
                    </div>
                  </div>
                  <svg 
                    className={`w-6 h-6 text-gray-400 transform transition-transform duration-300 ${openStates[index] ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openStates[index] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-[10px]">
                    <h4 className="font-medium mb-2 text-white">
                      Variants ({product.variants.edges.length})
                    </h4>
                    <div className="grid gap-3">
                      {product.variants.edges.map((edge, idx) => (
                        <div key={idx} className="border border-gray-700 p-3 rounded bg-[#262626]">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium text-white text-lg block mb-2">
                                  {product.title}
                                </span>
                              </div>
                              <span className="text-gray-400 text-sm">
                                SKU: {edge.node.sku}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm grid grid-cols-2 gap-2 text-gray-300">
                            <p>Price: ${edge.node.price}</p>
                            <p>Inventory: {edge.node.inventoryQuantity}</p>
                            {edge.node.compareAtPrice && (
                              <p>Compare at: ${edge.node.compareAtPrice}</p>
                            )}
                            {edge.node.barcode && (
                              <p>Barcode: {edge.node.barcode}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};