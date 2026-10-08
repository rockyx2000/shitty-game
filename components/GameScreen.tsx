"use client";

import { useCallback, useEffect, useState } from "react";
import { Container, Stack, Typography } from "@mui/material";
import Game from "./Game";
import Ranking, { type RankingData } from "./Ranking";

export default function GameScreen() {
  const [data, setData] = useState<RankingData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/scores");
    if (res.ok) setData((await res.json()) as RankingData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Typography variant="h4" component="h1">
          逃げるボタン
        </Typography>
        <Game onSubmitted={load} />
        <Ranking data={data} />
      </Stack>
    </Container>
  );
}
