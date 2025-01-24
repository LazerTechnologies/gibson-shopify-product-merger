"use client";
import {useState} from "react";

/** Types **/
import type {Product} from "./types";

export default function Home() {
  const [products, setProducts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"original" | "combined">("original");
  const [createResult, setCreateResult] = useState<any>(null);
  
  async function loadProducts() {
    console.log("Starting to load products...");
    setIsLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status}`);
      }

      const data = await res.json();
      console.log("Received data:", data);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createFirstProduct() {
    if (!products?.combinedProducts?.length) {
      console.error("No products to create");
      return;
    }

    setIsCreating(true);
    setCreateResult(null);

    try {
      const firstCombined = products.combinedProducts[0];
      const sizeOrder = [
        "Small",
        "Medium",
        "Large",
        "Extra Large",
        "2XL",
        "3XL",
      ];

      // Sort variants by size
      const sortedVariants = [...firstCombined.variants].sort(
        (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
      );

      console.log(
        "Sending variants:",
        JSON.stringify(
          sortedVariants.map((v) => ({
            size: v.size,
            sku: v.originalProduct.variants.edges[0]?.node?.sku,
          })),
          null,
          2
        )
      );

      const productInput = {
        product: {
          title: firstCombined.baseTitle,
          vendor: firstCombined.vendor,
          productType: firstCombined.productType,
          status: "DRAFT",
        },
        variants: {
          variants: sortedVariants.map((variant) => {
            const originalVariant =
              variant.originalProduct.variants.edges[0]?.node;
            const inventoryLevel =
              originalVariant?.inventoryItem?.inventoryLevels?.edges[0]?.node;

            return {
              price: originalVariant?.price || "0.00",
              sku:
                originalVariant?.sku ||
                `${
                  variant.originalProduct.handle
                }-${variant.size.toLowerCase()}`,
              compareAtPrice: originalVariant?.compareAtPrice || undefined,
              inventoryPolicy: "DENY",
              taxable: true,
              options: [variant.size],
              inventoryQuantities: inventoryLevel?.location
                ? [
                    {
                      availableQuantity: originalVariant.inventoryQuantity || 0,
                      locationId: inventoryLevel.location.id,
                    },
                  ]
                : undefined,
            };
          }),
        },
      };

      console.log("Creating product with input:", productInput);

      const res = await fetch("/api/products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productInput),
      });

      const data = await res.json();
      console.log("Create result:", data);

      if (!res.ok) {
        const errorDetails = data.details
          ? JSON.stringify(data.details, null, 2)
          : data.error;
        console.error("Failed to create product:", {
          error: data.error,
          details: data.details,
        });
        throw new Error(`Failed to create product: ${errorDetails}`);
      }

      setCreateResult(data);
    } catch (error) {
      console.error("Error creating product:", error);
      setCreateResult({ error: error.message });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Shopify Products</h1>
          <div className="space-x-4">
            {products && (
              <>
                <select
                  value={viewMode}
                  onChange={(e) =>
                    setViewMode(e.target.value as "original" | "combined")
                  }
                  className="px-3 py-2 border rounded-lg bg-black text-white"
                >
                  <option value="original">Original Products</option>
                  <option value="combined">Combined Products</option>
                </select>
                {viewMode === "combined" && (
                  <button
                    onClick={createFirstProduct}
                    disabled={isCreating || !products.combinedProducts?.length}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create First Product"}
                  </button>
                )}
              </>
            )}
            <button
              onClick={loadProducts}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "Load Products"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {!products ? (
            <p className="text-gray-500 text-center py-8">
              {isLoading
                ? "Loading products..."
                : "Click the button to load products"}
            </p>
          ) : viewMode === "original" ? (
            products.originalProducts.map((product: Product) => (
              <div
                key={product.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <h2 className="text-xl font-semibold">{product.title}</h2>
              </div>
            ))
          ) : (
            products.combinedProducts.map((product: any) => (
              <div
                key={product.baseTitle}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <h2 className="text-xl font-semibold">{product.baseTitle}</h2>
                <div className="mt-2 text-gray-600">
                  Variants: {product.variants.map((v) => v.size).join(", ")}
                </div>
              </div>
            ))
          )}
        </div>

        {viewMode === "combined" && (
          <>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">
                First Combined Product Preview:
              </h3>
              {products?.combinedProducts?.length > 0 && (
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(products.combinedProducts[0], null, 2)}
                </pre>
              )}
            </div>

            {createResult && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Create Result:</h3>
                <pre
                  className={`mt-2 p-4 rounded overflow-auto ${
                    createResult.error
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {JSON.stringify(createResult, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
