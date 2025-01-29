"use client";
import {useState, useEffect} from "react";

/** Types **/
import type {ProductNode, LinkedProductGroup, CombinedProduct} from "@/lib/types/ShopifyData";

interface ProductsResponse {
  originalProducts: ProductNode[];
  combinedProducts: CombinedProduct[];
  linkedGroups: LinkedProductGroup[];
}

export default function UpdateProducts() {
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openStates, setOpenStates] = useState<{[key: number]: boolean}>({});

  async function loadProducts() {
    console.log("Starting to load products...");
    setIsLoading(true);
    try {
      const res = await fetch("/api/products/fetch");
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status}`);
      };

      const data = await res.json();
      console.log("Received data:", data);
      setProducts(data);
      /** Initialize all products as open **/
      if (data?.combinedProducts) {
        const initialOpenStates = data.combinedProducts.reduce((
          acc: {[key: number]: boolean}, 
          _: CombinedProduct, 
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

  const updateProducts = async () => {
    console.log("Updating products...");
    setIsLoading(true);

    const combinedProducts = products?.combinedProducts;

    const testUpdate = combinedProducts?.slice(0, 1);

    try {
      const response = await fetch("/api/products/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: testUpdate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update products: ${response.status}`);
      }

      const data = await response.json();
      console.log("Update response: ", data);
    } catch (error) {
      console.error("Error Updating Products: ", error);
    } finally {
      setIsLoading(false);
    };
  };

  useEffect(() => {
    console.log("Products: ", products);
  }, [products]);
  
  return (
    <div className="min-h-screen p-8 bg-[#0a0a0a]">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            Products To Combine
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
            <h2 className="text-2xl font-semibold text-white">Combined Products ({products.combinedProducts.length})</h2>
            {products.combinedProducts.map((group, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-4 bg-[#1a1a1a]">
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => setOpenStates(prev => ({...prev, [index]: !prev[index]}))}
                >
                  <div className="flex flex-col gap-[8px]">
                    <h3 className="text-xl font-medium text-white">
                      {group.productData.baseTitle || "Untitled Group"}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-400">
                        <p className="font-medium mb-[5px]">
                          Vendor: {group.productData.vendor}
                        </p>
                        <p className="font-medium">
                          Type: {group.productData.productType}
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
                    <h4 className="font-medium mb-2 text-white">Variants ({group.productData.variants.length})</h4>
                    <div className="grid gap-3">
                      {group.productData.variants.map((variant, idx) => (
                        <div key={idx} className="border border-gray-700 p-3 rounded bg-[#262626]">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium text-white text-lg block mb-2">
                                  {group.productData.baseTitle}
                                </span>
                                <div className="flex gap-2">
                                  {variant.size && (
                                    <span className="px-2 py-1 text-xs bg-[#000435] text-white rounded">
                                      {variant.size}
                                    </span>
                                  )}
                                  {variant.color && (
                                    <span className="px-2 py-1 text-xs bg-[#000435] text-white rounded">
                                      {variant.color}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-gray-400 text-sm">
                                SKU: {variant.sku}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm grid grid-cols-2 gap-2 text-gray-300">
                            <p>Price: ${variant.price}</p>
                            <p>Inventory: {variant.inventoryQuantity}</p>
                            {variant.compareAtPrice && (
                              <p>Compare at: ${variant.compareAtPrice}</p>
                            )}
                            {variant.barcode && (
                              <p>Barcode: {variant.barcode}</p>
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