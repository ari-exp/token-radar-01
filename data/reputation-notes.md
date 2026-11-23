# Catatan Reputasi — token-radar-01 (data beku per 14 Nov 2026)

Tabel referensi: `reputation-reference.json` — 40 protokol watchlist, satu objek per
protokol, semua fakta bersumber URL. Null = tidak diketahui (bukan "tidak ada").
0/false hanya dipakai kalau ada bukti eksplisit.

## Metodologi

- Dikerjakan 4 agen riset paralel (masing-masing 10 protokol), sumber: docs resmi,
  laporan audit, DeFiLlama hacks, Rekt, CertiK Skynet, Immunefi, GitHub, Yearn
  Curation, The Tie risk rating.
- Cutoff keras 14 Nov 2026: fakta bertanggal setelah itu sengaja diabaikan.
  Satu pengecualian yang dicatat di bawah (K3 Capital) karena mengubah penilaian
  risiko secara material — tapi TIDAK masuk ke JSON.
- `exploits: []` berarti "tidak ada exploit yang diketahui per 14 Nov 2026",
  bukan "terbukti tidak pernah di-hack".

## Kelengkapan data

Area yang dihitung: audit, tim, admin control, bounty, GitHub (exploit tidak
dihitung karena semua baris punya array — kosong berarti tidak ada yang diketahui).

- **Penuh (4–5 area terisi): 8** — steakhouse-financial, gauntlet, veda, onre,
  lightning-network, curvance, noble, tori-finance.
- **Sebagian (2–3 area): 25** — usdd, upshift, bittensor-dtao, symbiotic,
  opentrade, hyperithm, plume-vaults, k3-capital, b14g, clearstar, saturn,
  lagoon, galaxy-curation, armitage-by-wintermute, lofty, doppler-finance,
  ember, keyrock, infinifi, axis, reti-pooling, yuzu-money, mezo-earn,
  tulipa-capital, firelight.
- **Tipis (0–1 area): 7** — nonce-capital (0 area: hanya sumber), rockawayx,
  hive-protocol, r25, tydro, valos, gami-labs (masing-masing 1 area).

Statistik cepat: tim publik 29, pseudonim 1 (doppler-finance), anonim 1
(saturn), null 9. Multisig terkonfirmasi 13, EOA tunggal 1 (keyrock, level
vault), null 26. Timelock terkonfirmasi 11, tanpa timelock 1 (upshift).
Bounty live 9, tidak ada 5, null 26. GitHub aktif terkonfirmasi 7.
Audit count = 0 eksplisit: 8 protokol (hyperithm, clearstar, galaxy-curation,
tydro, armitage-by-wintermute, lofty, gami-labs, tulipa-capital).

## Temuan penting

### Exploit sebelum cutoff (6 entri)
- **gauntlet — Resolv USR, 22 Mar 2026, ~$7,5 jt.** Exploit token eksternal
  (~80 jt USR dicetak, ~$25 jt diekstrak) menyebabkan bad debt di vault
  Gauntlet Frontier/Core. `compensated: false` di JSON, tapi nuansanya:
  kompensasi PARSIAL — 4.379.827 USDC bisa diklaim via Merkl per 4 Jun 2026,
  di bawah total kerugian; tidak ada post-mortem detail dalam 30 hari.
  Vault Prime tidak terdampak. Ini pembeda reputasi terbesar Steakhouse vs
  Gauntlet (Steakhouse tidak punya kerugian vault tercatat).
- **upshift — Kelp rsETH, 18 Apr 2026.** Bridge LayerZero 1-of-1 verifier
  dieksploitasi, ~116.500 rsETH (~$290–295 jt) dicuri; Upshift membekukan
  vault High Growth ETH dan Kelp Gain. Bukan bug kode Upshift (kontagion),
  kerugian ke deposan Upshift tidak terkuantifikasi → `usd_lost: null`.
  Upshift juga unik: upgrade TIDAK pakai timelock (ProxyAdmin 4-of-6).
- **bittensor-dtao — supply-chain, 2 Jul 2024, ~$8 jt.** Paket PyPI jahat
  v6.12.2 mencuri coldkey, ~32.000 TAO hilang, tanpa kompensasi; post-mortem
  OTF ada. Tidak ditemukan audit pihak ketiga konvensional maupun bounty
  Immunefi. dTAO sendiri live 13 Feb 2025 tanpa insiden.
- **b14g — 31 Okt 2026, ~$1,47 jt.** Satu transaksi menarik 97,05 jt CORE
  dari 91 vault via withdrawal 0 CORE (Core memperlakukan 0 = seluruh stake).
  Kontrak dijeda 66 menit kemudian via Safe multisig. Hard fork Core 2 Nov
  memulihkan ~70% (68,15 jt CORE); tim janji refund ~70% dalam 5–7 hari +
  sisanya mingguan — per ~9 Nov dana belum didistribusikan. Maka
  `compensated: true` di JSON artinya **pemulihan sebagian sedang berjalan,
  bukan lunas**.
- **curvance — 18 Mei 2026, ~$870 ribu.** Bukan bug Curvance: eBTC palsu
  Echo Protocol (1.000 eBTC di-mint) dijaminkan di pasar eBTC/WBTC Curvance
  di Monad lalu dipinjam ~11,3 WBTC. Pasar eBTC masih paused; kompensasi
  tidak terbukti per 14 Nov → null.
- **tydro — 4 Mei 2026, $0.** Insiden oracle (penyedia sebelumnya diserang),
  pasar di-pause, 0 harga salah masuk on-chain, 0 pengguna terdampak.
  Ini insiden dengan kerugian NOL — jangan diskor seperti exploit pencurian.

### Peringatan cutoff (setelah 14 Nov 2026 — TIDAK di JSON)
- **k3-capital — exploit sBOLD ~$3,43 jt pada 18 Nov 2026**, 4 hari setelah
  cutoff. Audit ChainSecurity Mei 2025 sebelumnya sudah menandai kelas bug
  yang sama (temuan high CS-SBOLD-008 soal akuntansi kolateral /
  self-liquidation). Penilaian risiko K3 berubah material pasca-cutoff.

### Jangan dikacaukan
- **InfiniFi ≠ Infini.** Exploit $49,5 jt (24 Feb 2025, ex-developer
  pertahankan admin rights) adalah milik **Infini neobank**, bukan InfiniFi.
  InfiniFi tidak punya insiden tercatat.
- **Doppler Finance** di sini adalah Doppler XRPfi (doppler.finance, eks
  Lotus, Girin Labs), BUKAN Doppler Whetstone/Uniswap v4 (audit Certora
  Nov 2024).
- **Valos ≠ ValOS (Lido).** Valos adalah credit vault Finlandia; ValOS adalah
  standar validator Lido — protokol berbeda.
- **CertiK "HIVE Protocol"** yang sempat muncul adalah proyek DBCC yang
  berbeda — tidak dipakai untuk hive-protocol.

### Sinyal merah lain
- **saturn — admin paling terpusat.** Tim anonim; 3 timelock yang
  masing-masing proposer-nya satu EOA (tercepat delay 1 jam); satu EOA dapat
  meng-upgrade kontrak USDat; 16 Okt 2026 timelock menyita 557.623 sUSDat
  (~$582 ribu) dari 2 wallet yang di-blacklist. Kerentanan Apr 2026
  (underflow membekukan withdrawal s/d 30 hari; toleransi 20% memungkinkan
  ekstraksi s/d 33,33% per panggilan oleh role PROCESSOR; TVL berisiko
  ~$35,7 jt) dilaporkan belum ditambal — tanpa kerugian dana terkonfirmasi,
  jadi tidak masuk `exploits`.
- **firelight — temuan audit pra-peluncuran serius.** Audit competition
  Immunefi (Agu–Sep 2026) menemukan banyak temuan High soal insolvensi:
  snapshot collateral yang stale membuat allocator bisa menjual cover
  $90 jt dengan collateral tersisa $7,7 jt (CAR 0,17 vs floor 1,2).
  Bukan exploit — tapi sinyal merah untuk skor reputasi.
- **mezo-earn — audit tidak sepenuhnya independen.** Satu-satunya audit
  Mezo Earn berasal dari Thesis Defense, lengan keamanan Thesis sendiri
  (afiliasi). Audit independen MUSD adalah Cantina (Apr 2025), bukan untuk
  Mezo Earn.
- **yuzu-money — "centralised by design".** Dedaub (Okt 2025) menyebut
  admin memegang banyak aspek penting; repo kontrak privat sehingga
  `github_active` tidak bisa diverifikasi.
- **symbiotic — current_version: false.** Audit terakhir ditambahkan
  7 Agu 2026; ada laporan rute/factory baru setelah itu belum diaudit ulang.
  Akun X-nya pernah dibajak Okt 2024 (phishing, tanpa kerugian terverifikasi).
- **usdd — catatan sejarah.** USDD 2.0 (Jan 2025) diaudit ChainSecurity +
  CertiK (5 audit, 2025), tidak ada hack kontrak yang diketahui — tapi depeg
  Juni 2022 (~$0,93) dan penarikan 12.000 BTC dari cadangan pada Agu 2024
  tanpa vote tetap menjadi catatan; pemegang admin key tidak ada catatan publik.
- **lofty — consent order California 14 Nov 2022 ($37.500, Chu & Ball).**
  Di luar skema JSON, tapi relevan reputasi.

## Jebakan skor — baca sebelum memakai tabel ini untuk rumus M_reputation

Pemetaan field → sinyal rumus v2 (S1 audit, S2 insiden, S3 pemulihan,
S4 GitHub, S5 tim, S6 multisig, S7 bounty, S8 umur dari snapshot):

1. **Kurator ≠ pemilik kontrak.** Steakhouse, Gauntlet, Nonce, Galaxy,
   Armitage, Keyrock, Hyperithm, Clearstar, Gami Labs, Tulipa adalah kurator
   (vault di Morpho / Veda / BoringVault / Euler / Lagoon). Audit, bounty,
   dan multisig yang tercatat untuk mereka sebagian besar adalah milik
   INFRASTRUKTUR yang mereka pakai (mis. 25 audit Steakhouse/Gauntlet =
   audit Morpho; audit Clearstar = Morpho Vault V2). Jangan skor audit
   kurator seolah audit kode miliknya sendiri. Sebaliknya, `count: 0`
   untuk kurator (galaxy, armitage, hyperithm, clearstar, lofty, gami,
   tulipa, tydro) berarti "tidak ada audit atas kode sendiri yang
   dipublikasikan" — risikonya ada di infra, bukan nol mutlak.
2. **lightning-network — multisig "2-of-2" BUKAN admin multisig.** Itu
   level channel (setiap channel adalah output multisig 2-of-2 di Bitcoin);
   protokolnya tidak punya admin sentral. Untuk S6, perlakukan sebagai
   tidak-berlaku (unknown), bukan sebagai tata kelola multisig yang baik.
   Sama halnya: tidak ada audit pihak ketiga terverifikasi dan tidak ada
   bounty live — tapi GitHub paling aktif dan tim paling publik.
3. **keyrock — admin EOA dari data level vault.** Owner, curator, dan
   allocator masing-masing single key (vault RLUSD, data Ampdat; halaman
   dibaca setelah cutoff — peran kemungkinan sama sebelum cutoff, tapi
   tandai caveat ini). Ini data tingkat vault, bukan perusahaan Keyrock.
4. **curvance — threshold "1-of-5" adalah Emergency Council** untuk
   respons darurat, bukan threshold multisig normal; timelock 5 hari ada
   tapi rutin dilewati council darurat.
5. **Tydro $0 dan B14G "compensated: true"** — lihat bagian exploit di atas;
   keduanya butuh penanganan khusus di S2/S3, jangan dibaca mentah.
6. **r25 — konflik sumber.** BlockSec + SlowMist mengaudit vault (laporan
   BlockSec ditemukan), tapi DIA mencatat "Audited: No". Repo yang diaudit
   bersifat privat.
7. **reti-pooling — count 2 tanpa nama firma.** DefiLlama mencatat 2 audit,
   tapi nama firma tidak terungkap di sumber mana pun yang bisa diakses.
8. **plume-vaults — bounty null, bukan false.** Immunefi Attackathon
   (17 Jul–14 Agu 2025, pool maks $200 ribu) sudah berakhir; halaman bug
   bounty live mengembalikan 404. Tidak ada bounty live yang ditemukan,
   tapi tidak ada pernyataan eksplisit "tidak ada bounty".
9. **veda — count 33** adalah jumlah engagement audit (0xMacro + Spearbit /
   Sigma Prime / Certora / dll.), bukan 33 laporan audit penuh yang
   berbeda-beda. Tetap sinyal kuat, tapi jangan bandingkan mentah dengan
   count protokol lain.
10. **noble — audit Sherlock (Sep 2025) mencakup Noble Dollar (USDN,
    produk M0), bukan chain Noble itu sendiri;** DefiLlama mencatat 0 audit
    untuk chain-nya. CertiK mencatat tidak ada bug bounty.
11. **onre — timelock null sengaja.** Docs mengklaim timelock 6 jam di satu
    halaman tapi bodinya menyebut masih diimplementasikan → tidak
    terkonfirmasi per 14 Nov.
12. **S8 umur tidak dihitung dari tabel ini** — umur diambil dari
    `listed_at` di snapshot (maturityFactor sudah membawa umur); jangan
    hitung ganda.

## Yang tidak bisa diverifikasi

- Admin control untuk 26 dari 40 protokol (multisig null) — kebanyakan
  kurator dan protokol muda tidak mempublikasikan struktur adminnya.
- Bounty untuk 26 dari 40 protokol — tidak ada program yang ditemukan,
  tapi ketiadaan bukti bukan bukti ketiadaan (terutama protokol yang
  memakai audit competition sekali jalan, bukan bounty berkelanjutan).
- GitHub untuk 33 dari 40 protokol — banyak repo privat (kurator, RWA,
  stablecoin) atau repo tidak terhubung jelas ke nama protokol.
- `current_version` hanya terisi untuk 7 protokol (steakhouse, gauntlet,
  veda, usdd, k3-capital true; symbiotic, curvance, saturn false) — untuk
  sisanya tidak bisa dipastikan apakah audit mencakup versi kode yang
  dipakai sekarang.
- Exploit dengan kerugian kecil / insiden yang tidak diliput media besar
  mungkin terlewat, terutama untuk protokol kecil (r25, tydro, valos,
  gami-labs, tulipa-capital, firelight, hive-protocol).
