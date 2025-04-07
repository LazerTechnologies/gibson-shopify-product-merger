"use client";
import {useState, useEffect} from "react";

/** Components **/
import {Header} from "@/components";

/** Types **/
import type {NewCombinedProduct, ProductNode} from "@/lib/types/ShopifyData";

export default function MergeNonMergedProducts() {
  const [combinedProducts, setCombinedProducts] = useState<NewCombinedProduct[]>([]);
  const [productsNotInGroups, setProductsNotInGroups] = useState<ProductNode[]>([]);
  const [stats, setStats] = useState<{
    totalProducts: number;
    totalProductsInGroups: number;
    totalProductGroups: number;
    totalProductsNotInGroups: number;
  }>({
    totalProducts: 0,
    totalProductsInGroups: 0,
    totalProductGroups: 0,
    totalProductsNotInGroups: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      const res = await fetch("/api/products/getNonMergedProducts");
      const data = await res.json();
      setCombinedProducts(data?.productGroups);
      setProductsNotInGroups(data?.productsNotInGroups);
      setStats(data?.stats);
      setIsLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    console.log("products: ", combinedProducts);
    console.log("productsNotInGroups: ", productsNotInGroups);
    console.log("stats: ", stats);
  }, [combinedProducts, productsNotInGroups, stats]);

  return (
    <div className="min-h-screen p-8 bg-[#0a0a0e]">
      <main className="max-w-4xl mx-auto">
        <Header />
      </main>
    </div>
  );
};