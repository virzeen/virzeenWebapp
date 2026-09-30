import { Skeleton } from "@virzeen/ui";

/**
 * The product editor while it loads: its top bar, then the product page's layout (product-details.tsx): name and
 * price on the right from lg, the gallery on the left.
 */
export default function ProductEditorLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex items-center gap-3 border-b border-line py-2">
        <Skeleton shape="text" className="w-24" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton shape="text" className="w-16" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_1fr] lg:gap-x-16">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:max-w-md">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton shape="text" className="w-1/3" />
          <Skeleton shape="text" className="w-1/4" />
        </div>
        <Skeleton shape="image" className="lg:col-start-1 lg:row-span-2 lg:row-start-1" />
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:max-w-md">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
