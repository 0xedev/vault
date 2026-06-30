/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import {
  DEFAULT_IMAGE_URL,
  fallbackShareData,
  getListingShareData,
} from "@/lib/listing-share";

export const dynamic = "force-dynamic";

const size = {
  width: 1200,
  height: 630,
};

const validKinds = new Set<ListingShareKind>([
  "nft",
  "miniapps",
  "x",
  "farcaster",
  "clanker",
  "bundles",
]);

function asKind(value: string | null): ListingShareKind {
  return validKinds.has(value as ListingShareKind)
    ? (value as ListingShareKind)
    : "nft";
}

const kindLabels: Record<ListingShareKind, string> = {
  nft: "NFT LOAN",
  miniapps: "MINI APP",
  x: "X ACCOUNT",
  farcaster: "FARCASTER FID",
  clanker: "CLANKER TOKEN",
  bundles: "BUNDLE",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = asKind(url.searchParams.get("kind"));
  const id = url.searchParams.get("id") || undefined;
  const data =
    (await getListingShareData(kind, id)) || fallbackShareData(kind);
  const shouldRenderImage =
    data.imageUrl && data.imageUrl !== DEFAULT_IMAGE_URL;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f5ee",
          color: "#101010",
          fontFamily: "Arial, sans-serif",
          padding: 42,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            border: "2px solid #1f2937",
            background: "#fffdf8",
          }}
        >
          <div
            style={{
              width: 410,
              height: "100%",
              display: "flex",
              background: "#0648a8",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {shouldRenderImage ? (
              <img
                src={data.imageUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 120,
                  border: "14px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 72,
                  fontWeight: 800,
                }}
              >
                BSH
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "44px 50px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 38,
              }}
            >
              <div
                style={{
                  display: "flex",
                  letterSpacing: 3,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#0648a8",
                }}
              >
                BASESHIRE HETHAWAY
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "10px 16px",
                  border: "2px solid #111827",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {kindLabels[kind]}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: data.title.length > 34 ? 44 : 56,
                  lineHeight: 1.04,
                  fontWeight: 900,
                  marginBottom: 16,
                  maxWidth: 640,
                }}
              >
                {data.title}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  lineHeight: 1.25,
                  color: "#4b5563",
                  maxWidth: 610,
                }}
              >
                {data.subtitle}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 24,
                  flexWrap: "wrap",
                }}
              >
                {data.details.slice(0, 4).map((detail) => (
                  <div
                    key={detail.label}
                    style={{
                      width: 140,
                      display: "flex",
                      flexDirection: "column",
                      border: "2px solid #d1d5db",
                      padding: "10px 12px",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 13,
                        letterSpacing: 1.5,
                        color: "#6b7280",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        marginBottom: 7,
                      }}
                    >
                      {detail.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: detail.value.length > 12 ? 20 : 24,
                        lineHeight: 1.05,
                        fontWeight: 900,
                        color: "#111827",
                      }}
                    >
                      {detail.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "2px solid #d1d5db",
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    letterSpacing: 2,
                    color: "#6b7280",
                    fontWeight: 800,
                  }}
                >
                  LISTING
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 800,
                    marginTop: 4,
                  }}
                >
                  {data.id || "MARKETPLACE"}
                </div>
              </div>
              {data.priceLabel ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 38,
                    fontWeight: 900,
                    color: "#0648a8",
                  }}
                >
                  {data.priceLabel}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#0648a8",
                  }}
                >
                  vault marketplace
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
