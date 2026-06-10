// Dynamic Open Graph image for each board.
// Returns a 1200×630 image with the board title and background.
// Generated on-demand and cached by Vercel's Edge Network.
// (Crawlers have no session, so getBoard throws → defaults are used.)

import { ImageResponse } from "next/og";
import { getBoard } from "@/features/boards/actions";

export const alt = "Board view";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ boardId: string }>;
}

export default async function BoardOgImage({ params }: Props) {
  const { boardId } = await params;

  let title = "Project Board";
  let background = "#0052CC";

  try {
    const board = await getBoard(boardId);
    if (board) {
      title = board.title;
      background = board.background.startsWith("linear-gradient")
        ? "#0052CC" // CSS gradients aren't supported in ImageResponse
        : board.background;
    }
  } catch {
    // Use defaults on error (e.g. unauthenticated crawler).
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "60px",
          background: background,
          fontFamily: "system-ui, sans-serif",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "white",
            }}
          >
            ■
          </div>
          <div style={{ color: "white", fontSize: "24px", fontWeight: 600 }}>
            Trello Clone
          </div>
        </div>

        {/* Board title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "white",
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "24px",
              marginTop: "16px",
            }}
          >
            Project board — Trello Clone
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
