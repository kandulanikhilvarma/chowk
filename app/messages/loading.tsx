import { RowListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Chats</h1>
      <RowListSkeleton label="Loading chats" />
    </div>
  );
}
