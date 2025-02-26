interface AuthModalProps {
  password: string;
  setPassword: (password: string) => void;
  verifyPassword: () => void;
};

export function AuthModal({
  password, 
  setPassword, 
  verifyPassword
}: AuthModalProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0e]">
      <div className="bg-[#161620] p-8 rounded-lg shadow-lg border border-gray-800 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-100 mb-6 text-center">Gibson Product Merger</h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Enter Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e1e2a] border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            />
          </div>
          <button
            onClick={verifyPassword}
            className="w-full px-4 py-2 bg-lime-900 text-gray-200 rounded border border-gray-700 hover:bg-[#252535] transition-colors"
          >
            Verify Password
          </button>
        </div>
      </div>
    </div>
  );
};