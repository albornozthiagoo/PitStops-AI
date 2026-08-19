export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
    </div>
  );
}