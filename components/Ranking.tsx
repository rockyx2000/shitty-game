"use client";

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export type RankingData = {
  ranking: { rank: number; name: string; ms: number }[];
  me: { name: string; best: number | null; rank: number | null };
};

export default function Ranking({ data }: { data: RankingData | null }) {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        ランキング(最速タイム)
      </Typography>
      {data?.me && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {data.me.name} さん:{" "}
          {data.me.best === null
            ? "未記録"
            : `${(data.me.best / 1000).toFixed(2)} 秒 / ${data.me.rank ? `${data.me.rank} 位` : "圏外"}`}
        </Typography>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>順位</TableCell>
              <TableCell>名前</TableCell>
              <TableCell align="right">タイム</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.ranking.map((r) => (
              <TableRow key={r.rank}>
                <TableCell>{r.rank}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{(r.ms / 1000).toFixed(2)} 秒</TableCell>
              </TableRow>
            ))}
            {data?.ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  まだ誰も捕まえていません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
