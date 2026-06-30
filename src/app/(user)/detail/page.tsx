import DetailClient from "./DetailClient";
import { firstParam, listingMetadata } from "@/lib/listing-share";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  return listingMetadata({ kind: "nft", id: firstParam(params?.id) });
}

export default function DetailPage() {
  return <DetailClient />;
}
