"use client";
import {useState, useEffect} from "react";
import Link from "next/link";
import Image from "next/image";

/** Types **/
import type {GetMergeProductsResponse} from "@/lib/types";

/**
 * Products To Test With
 * 
 * @title - Farewell Tour x Gibson Clean Longsleeve Tee
 * 
 * @variant - Black Long Sleeve
 * GA-FWT-BLKLSTLG
 * GA-FWT-BLKLST2X
 * GA-FWT-BLKLSTSM
 * GA-FWT-BLKLSTMD
 * GA-FWT-BLKLSTXL
 * 
 * @variant - White Long Sleeve
 * GA-FWT-WHTLSTLG
 * GA-FWT-WHTLST2X
 * GA-FWT-WHTLSTMD
 * GA-FWT-WHTLSTSM
 * GA-FWT-WHTLSTXL
 */

export default function Home() {
  const [skus, setSkus] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<GetMergeProductsResponse | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editedProductData, setEditedProductData] = useState<{
    title: string;
    vendor: string;
    productType: string;
    options?: {
      name: string;
      values: string[];
    }[];
  } | null>(null);
  
  const addSkuField = () => {
    setSkus([...skus, '']);
  };
  
  const updateSku = (index: number, value: string) => {
    const updatedSkus = [...skus];
    updatedSkus[index] = value;
    setSkus(updatedSkus);
  };
  
  const removeSku = (index: number) => {
    if (skus.length > 1) {
      const updatedSkus = skus.filter((_, i) => i !== index);
      setSkus(updatedSkus);
    }
  };
  
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const filteredSkus = skus.filter(sku => sku.trim() !== '');
      
      if (filteredSkus.length === 0) {
        alert('Please enter at least one SKU');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/products/getProductsBySku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({skus: filteredSkus}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data);
      /** Initialize selected products with all product IDs **/
      if (data?.products && data?.products.length > 0) {
        setSelectedProducts(data?.products.map((product: {id: string}) => product?.id));
        
        /** Initialize edited product data with the first product's information **/
        const firstProduct = data?.products[0];
        setEditedProductData({
          title: firstProduct?.title || '',
          vendor: firstProduct?.vendor || '',
          productType: firstProduct?.productType || '',
          options: firstProduct?.options || []
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProductDataChange = (field: 'title' | 'vendor' | 'productType', value: string) => {
    if (editedProductData) {
      setEditedProductData({
        ...editedProductData,
        [field]: value
      });
    }
  };
  
  const handleOptionNameChange = (optionIndex: number, value: string) => {
    if (editedProductData?.options) {
      const updatedOptions = [...editedProductData.options];
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        name: value
      };
      setEditedProductData({
        ...editedProductData,
        options: updatedOptions
      });
    }
  };
  
  const handleOptionValueChange = (optionIndex: number, valueIndex: number, value: string) => {
    if (editedProductData?.options) {
      const updatedOptions = [...editedProductData.options];
      const updatedValues = [...updatedOptions[optionIndex].values];
      updatedValues[valueIndex] = value;
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        values: updatedValues
      };
      setEditedProductData({
        ...editedProductData,
        options: updatedOptions
      });
    }
  };

  useEffect(() => {
    console.log("products: ", products);
  }, [products]);
  
  return (
    <div className="min-h-screen p-8 bg-[#0a0a0e]">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <h1 className="text-3xl font-bold text-gray-100">
            Product Merger
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-gray-300 hover:text-gray-100 border-b border-gray-800 hover:border-gray-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/" className="text-gray-300 hover:text-gray-100 border-b border-gray-800 hover:border-gray-300 transition-colors">
              Products
            </Link>
            <Link href="/" className="text-gray-300 hover:text-gray-100 border-b border-gray-800 hover:border-gray-300 transition-colors">
              Settings
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-6 mt-8">
          <div className="bg-[#161620] p-6 rounded-lg shadow-lg border border-gray-800">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Enter Product SKUs</h2>
            <div className="space-y-4">
              {skus.map((sku, index) => (
                <div key={index} className="flex items-center gap-2">
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
                    disabled={skus.length === 1}
                  >
                    Remove
                  </button>
                </div>
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

          {products && products?.products && products?.products?.length > 0 && editedProductData && (() => {
            const firstProduct = products?.products[0];
            const firstImage = firstProduct?.featuredMedia?.preview?.image?.url || firstProduct?.media?.edges?.[0]?.node?.image?.url;
            
            return (
              <div className="bg-[#161620] p-6 rounded-lg shadow-lg border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-100">Products Found: {products?.count}</h2>
                  <button
                    disabled={selectedProducts?.length < 2}
                    className="px-4 py-2 bg-teal-800 text-gray-100 rounded hover:bg-teal-700 transition-colors disabled:opacity-50 border border-teal-900"
                  >
                    Merge Selected Products
                  </button>
                </div>
                
                <div className="p-4">
                  {/** Product Main Data **/}
                  <div className="flex gap-4 mb-6">
                    <div 
                      className="inline-block h-[100px] w-[100px] relative border border-gray-800 rounded-[5px] overflow-hidden p-1"
                    >
                      {firstImage && (
                        <Image
                          src={firstImage}
                          alt="Product Image"
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 gap-2">
                      <div className="flex flex-col">
                        <label htmlFor="productTitle" className="text-xs text-gray-400 mb-1">Title</label>
                        <input
                          id="productTitle"
                          type="text"
                          value={editedProductData?.title || ''}
                          onChange={(e) => handleProductDataChange('title', e.target.value)}
                          className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-lg text-sm"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="productVendor" className="text-xs text-gray-400 mb-1">Vendor</label>
                        <input
                          id="productVendor"
                          type="text"
                          value={editedProductData?.vendor || ''}
                          onChange={(e) => handleProductDataChange('vendor', e.target.value)}
                          className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="productType" className="text-xs text-gray-400 mb-1">Type</label>
                        <input
                          id="productType"
                          type="text"
                          value={editedProductData?.productType || ''}
                          onChange={(e) => handleProductDataChange('productType', e.target.value)}
                          className="bg-[#1e1e2a] text-gray-200 px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/** Product Variants Section **/}
                  <div className="mt-6 border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">Product Variants</h3>
                    
                    {/** Options Display **/}
                    {editedProductData?.options?.map((option, optionIndex) => (
                      <div key={`option-${optionIndex}`} className="mb-6">
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
                    ))}
                    
                    {/** Variants Table **/}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-[#1a1a25]">
                          <tr>
                            <th scope="col" className="px-4 py-3 rounded-tl-lg">Image</th>
                            <th scope="col" className="px-4 py-3">Variant</th>
                            <th scope="col" className="px-4 py-3">Size</th>
                            <th scope="col" className="px-4 py-3">Color</th>
                            <th scope="col" className="px-4 py-3">SKU</th>
                            <th scope="col" className="px-4 py-3">Price</th>
                            <th scope="col" className="px-4 py-3 rounded-tr-lg">Inventory</th>
                          </tr>
                        </thead>
                        <tbody>
                          {firstProduct?.variants?.map((variant, variantIndex) => (
                            <tr 
                              key={`variant-${variantIndex}`}
                              className={`border-b border-gray-800 ${variantIndex % 2 === 0 ? 'bg-[#1e1e2a]' : 'bg-[#1a1a25]'}`}
                            >
                              <td className="px-4 py-3 w-16">
                                {variant?.image && (
                                  <div className="h-10 w-10 relative rounded overflow-hidden">
                                    <Image
                                      src={variant.image}
                                      alt={variant?.title || ''}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">{variant?.title}</td>
                              <td className="px-4 py-3">{variant?.size}</td>
                              <td className="px-4 py-3">{variant?.color}</td>
                              <td className="px-4 py-3">{variant?.sku}</td>
                              <td className="px-4 py-3">${variant?.price}</td>
                              <td className="px-4 py-3">{variant?.inventoryQuantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
};