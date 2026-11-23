# token-radar-01 — radar-2.2

![token-radar-01](https://make.fun/badge/token-radar-01.svg)
[![rank](https://make.fun/badge/token-radar-01/ari-exp/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ari-exp/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

An offline token-launch radar that ranks pre-token protocols by implied value
and gives a concrete research/farming plan for each. It reads the frozen
14 Nov 2026 snapshot, covers all 40 watchlist slugs plus 186 early protocols
below the watchlist floor, and writes a self-contained dashboard with sliders
for what-if scenarios. No network at run time and no CDN in the dashboard.

Model in one line: `implied = tvl_usd x categoryMedian(mcap/tvl) x size x growth x maturity x reputation`.

Run with `node main.ts --input <snapshot.json> --output <dir>` (Node 22+).
The dashboard reads the generated `data.js` from the same directory.
