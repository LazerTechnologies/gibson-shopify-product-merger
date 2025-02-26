import Link from "next/link";

export function Header() {
  return (
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
  );
};