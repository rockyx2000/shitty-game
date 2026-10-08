"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";

// 段階ごとにボタンが小さく、逃げる反応距離が大きくなる
const STAGES = [
  { size: 96, radius: 160, cooldown: 350 },
  { size: 64, radius: 180, cooldown: 300 },
  { size: 40, radius: 200, cooldown: 250 },
  { size: 24, radius: 220, cooldown: 200 },
  { size: 12, radius: 240, cooldown: 150 },
];

type Phase = "idle" | "playing" | "submitting" | "done" | "error";

export default function Game({ onSubmitted }: { onSubmitted: () => void }) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const tokenRef = useRef("");
  const startRef = useRef(0);
  const lastFleeRef = useRef(0);

  const randomPos = useCallback(
    (size: number, from?: { x: number; y: number }) => {
      const a = arenaRef.current!.getBoundingClientRect();
      const maxX = a.width - size;
      const maxY = a.height - size;
      let p = { x: 0, y: 0 };
      // 現在位置からなるべく遠い候補を選ぶ
      for (let i = 0; i < 8; i++) {
        const c = { x: Math.random() * maxX, y: Math.random() * maxY };
        if (!from || Math.hypot(c.x - from.x, c.y - from.y) > 200) {
          p = c;
          break;
        }
        p = c;
      }
      return p;
    },
    [],
  );

  const start = async () => {
    setResult(null);
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      if (!res.ok) throw new Error();
      tokenRef.current = ((await res.json()) as { token: string }).token;
    } catch {
      setPhase("error");
      return;
    }
    setStage(0);
    setPos(randomPos(STAGES[0].size));
    startRef.current = performance.now();
    setElapsed(0);
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(
      () => setElapsed(performance.now() - startRef.current),
      50,
    );
    return () => clearInterval(id);
  }, [phase]);

  const onMove = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    const s = STAGES[stage];
    const a = arenaRef.current!.getBoundingClientRect();
    const cx = pos.x + s.size / 2;
    const cy = pos.y + s.size / 2;
    const d = Math.hypot(e.clientX - a.left - cx, e.clientY - a.top - cy);
    const now = performance.now();
    if (d < s.radius && now - lastFleeRef.current > s.cooldown) {
      lastFleeRef.current = now;
      setPos(randomPos(s.size, pos));
    }
  };

  const onCatch = async (e: React.PointerEvent) => {
    // キーボード操作(Tab+Enter)での不正を避け、ポインタのみ有効
    e.preventDefault();
    if (phase !== "playing") return;
    if (stage < STAGES.length - 1) {
      const next = stage + 1;
      setStage(next);
      setPos(randomPos(STAGES[next].size));
      return;
    }
    const ms = Math.round(performance.now() - startRef.current);
    setElapsed(ms);
    setResult(ms);
    setPhase("submitting");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, ms }),
      });
      if (!res.ok) throw new Error();
      setPhase("done");
      onSubmitted();
    } catch {
      setPhase("error");
    }
  };

  const s = STAGES[stage];
  const playing = phase === "playing";

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {playing
          ? `ステージ ${stage + 1} / ${STAGES.length}　${(elapsed / 1000).toFixed(2)} 秒`
          : result !== null
            ? `記録: ${(result / 1000).toFixed(2)} 秒`
            : "スタートボタンを捕まえろ"}
      </Typography>
      <Box
        ref={arenaRef}
        onPointerMove={onMove}
        sx={{
          position: "relative",
          height: 360,
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        {playing ? (
          <Button
            variant="contained"
            color="error"
            tabIndex={-1}
            onPointerDown={onCatch}
            sx={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: s.size,
              height: s.size,
              minWidth: 0,
              p: 0,
              fontSize: Math.max(s.size / 5, 0),
              transition: "left 120ms, top 120ms",
            }}
          >
            {s.size >= 40 ? "押せ" : ""}
          </Button>
        ) : (
          <Box
            sx={{ display: "grid", placeItems: "center", height: "100%", gap: 2 }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Button
                variant="contained"
                size="large"
                onClick={start}
                disabled={phase === "submitting"}
              >
                {phase === "idle" ? "スタート" : "もう一回"}
              </Button>
              {phase === "error" && (
                <Typography color="error" sx={{ mt: 1 }}>
                  通信に失敗しました。もう一回どうぞ。
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
