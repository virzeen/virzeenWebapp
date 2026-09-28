import { Skeleton, Stack } from "@virzeen/ui";

export default function AccountLoading() {
  return (
    <Stack gap={4} aria-busy>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </Stack>
  );
}
