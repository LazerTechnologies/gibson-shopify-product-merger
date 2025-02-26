interface AlertMessageProps {
  success: boolean | null;
  successMessage: string;
  errorMessage: string;
}

export function AlertMessage({success, successMessage, errorMessage}: AlertMessageProps) {
  if (success === null) return null;
  
  return success ? (
    <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded text-green-300">
      {successMessage}
    </div>
  ) : (
    <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-300">
      {errorMessage}
    </div>
  );
};