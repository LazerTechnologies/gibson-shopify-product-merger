"use client";
import {useState, useEffect, Fragment} from "react";

/** Components **/
import {
  Header,
  SkuInputSection,
  MergedProductCard,
  OriginalProductsCard
} from "@/components";

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
  const [isMerging, setIsMerging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<boolean | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean | null>(null);
  const [products, setProducts] = useState<GetMergeProductsResponse | null>(null);
  const [editedProductData, setEditedProductData] = useState<Record<string, unknown> | null>(null);
  
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
      console.log("data: ", data);
      /** Initialize selected products with all product IDs **/
      if (data?.products && data?.products.length > 0) {
        
        /** Initialize edited product data with the first product's information **/
        const firstProduct = data?.products[0];
        setEditedProductData({
          ...firstProduct,
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
      const updatedOptions = [...(editedProductData.options as Array<{name: string, values: string[]}>)];
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
      const updatedOptions = [...(editedProductData.options as Array<{name: string, values: string[]}>)];
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

  const handleMergeProducts = async () => {
    if (!editedProductData) return;
    
    try {
      setIsMerging(true);
      setMergeSuccess(null);
      
      const response = await fetch('/api/products/newMerge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mergedProductData: editedProductData
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to merge products');
      };

      const resJson = await response.json();
      console.log("resJson: ", resJson);
      
      setMergeSuccess(true);
      alert('Products merged successfully!');
    } catch (error) {
      console.error('Error merging products:', error);
      setMergeSuccess(false);
      alert('Failed to merge products. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };
  
  const handleDeleteProduct = async (productIds: string[]) => {
    try {
      setIsDeleting(true);
      setDeleteSuccess(null);
      
      const response = await fetch('/api/products/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      
      await response.json();
      
      /** Remove the deleted product from the list **/
      if (products?.products) {
        const updatedProducts = {
          ...products,
          products: products.products.filter((product: {id: string}) => !productIds.includes(product?.id)),
          count: products.count - 1
        };
        setProducts(updatedProducts);
      }
      
      setDeleteSuccess(true);
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      setDeleteSuccess(false);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    console.log("products: ", products);
  }, [products]);
  
  return (
    <div className="min-h-screen p-8 bg-[#0a0a0e]">
      <main className="max-w-4xl mx-auto">
        <Header />
        <div className="flex flex-col gap-6 mt-8">
          <SkuInputSection 
            skus={skus}
            updateSku={updateSku}
            removeSku={removeSku}
            addSkuField={addSkuField}
            fetchProducts={fetchProducts}
            isLoading={isLoading}
          />
          {products && products?.products && products?.products?.length > 0 && editedProductData && (
            <Fragment>
              <MergedProductCard
                products={products}
                isMerging={isMerging}
                handleMergeProducts={handleMergeProducts}
                mergeSuccess={mergeSuccess}
                editedProductData={editedProductData}
                handleProductDataChange={handleProductDataChange}
                handleOptionNameChange={handleOptionNameChange}
                handleOptionValueChange={handleOptionValueChange}
              />
              <OriginalProductsCard
                products={products}
                deleteSuccess={deleteSuccess}
                isDeleting={isDeleting}
                handleDeleteProduct={handleDeleteProduct}
              />
            </Fragment>
          )}
        </div>
      </main>
    </div>
  );
}