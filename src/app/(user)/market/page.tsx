import MarketClient from "./MarketClient";
import {
  firstParam,
  listingKindFromSearchTab,
  listingMetadata,
} from "@/lib/listing-share";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const id = firstParam(params?.id);
  const kind = listingKindFromSearchTab(firstParam(params?.tab));
  return listingMetadata({ kind, id });
}

export default function MarketPage() {
  return <MarketClient />;
}
