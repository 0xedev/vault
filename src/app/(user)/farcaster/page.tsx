import FarcasterClient from "./FarcasterClient";
import { firstParam, listingMetadata } from "@/lib/listing-share";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  return listingMetadata({ kind: "farcaster", id: firstParam(params?.id) });
}

export default function FarcasterPage() {
  return <FarcasterClient />;
}
