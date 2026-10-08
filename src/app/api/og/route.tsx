import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * Dynamic OpenGraph generator — renders an aviation-terminal boarding pass
 * with IATA codes, carrier, slashed retail vs glitch price and Glitch Score.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const o = (searchParams.get("o") ?? "BLR").slice(0, 4).toUpperCase();
  const d = (searchParams.get("d") ?? "DPS").slice(0, 4).toUpperCase();
  const airline = searchParams.get("airline") ?? "FlyGlitch Radar";
  const price = searchParams.get("price") ?? "₹8,490";
  const retail = searchParams.get("retail") ?? "₹29,500";
  const score = searchParams.get("score") ?? "92";
  const cabin = searchParams.get("cabin") ?? "ECONOMY";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #07090e 0%, #0b1220 55%, #07110d 100%)",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
          padding: 48,
          position: "relative",
        }}
      >
        {/* Header strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              ⚡
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>FLYGLITCH AI</div>
          </div>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 4,
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            LIVE GLITCH RADAR
          </div>
        </div>

        {/* Route line */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 64 }}>
          <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: 4, color: "#f8fafc" }}>{o}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 44 }}>✈</div>
            <div
              style={{
                width: 180,
                height: 2,
                background:
                  "repeating-linear-gradient(90deg, #10b981 0 12px, transparent 12px 22px)",
              }}
            />
            <div style={{ fontSize: 18, color: "#64748b", letterSpacing: 3 }}>{cabin}</div>
          </div>
          <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: 4, color: "#f8fafc" }}>{d}</div>

          {/* Score badge */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #10b981",
              borderRadius: 20,
              padding: "22px 30px",
              background: "rgba(16,185,129,0.12)",
            }}
          >
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#10b981" }}>
              {`⚡ ${score}`}
            </div>
            <div style={{ fontSize: 20, letterSpacing: 4, color: "#10b981" }}>GLITCH SCORE</div>
          </div>
        </div>

        {/* Fare block */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#64748b", letterSpacing: 2 }}>RETAIL</div>
            <div
              style={{
                fontSize: 44,
                color: "#64748b",
                textDecoration: "line-through",
                fontWeight: 600,
              }}
            >
              {retail}
            </div>
          </div>
          <div style={{ fontSize: 40, color: "#475569", paddingBottom: 8 }}>→</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#10b981", letterSpacing: 2 }}>GLITCH PRICE</div>
            <div style={{ fontSize: 72, color: "#10b981", fontWeight: 800 }}>{price}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 26, color: "#cbd5e1", paddingBottom: 14 }}>
            {airline}
          </div>
        </div>

        {/* Footer barcode strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 26,
            background:
              "repeating-linear-gradient(90deg, #10b981 0 6px, transparent 6px 14px, #f59e0b 14px 17px, transparent 17px 30px)",
            opacity: 0.55,
            display: "flex",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
