import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-16">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </main>
  );
}
