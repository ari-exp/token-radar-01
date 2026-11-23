/**
 * radar-2.2 valuation model for the token launch radar.
 *
 * Pre-token protocols are valued from comparable tokened protocols in the same
 * category: a clamped median market-cap/TVL multiple is adjusted for size,
 * recent TVL growth and maturity, then applies a reputation discount when a
 * reference table is supplied. The model is deliberately conservative and
 * produces no airdrop promises; it only ranks candidates for further research.
 */

export const MODEL_VERSION = 'radar-2.2' as const;

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface Comparable {
  slug: string;
  name: string;
  mcap_usd: number;
  tvl_usd: number;
  ratio: number;
}

export interface CategoryPeerTable {
  category: string;
  multiple: number;
  peer_count: number;
  source: 'category' | 'global';
  quartile_low: number;
  quartile_high: number;
  peers: Comparable[];
}

export interface CategoryMultiples {
  byCategory: Map<string, number>;
  global: number;
  comparables: Map<string, Comparable[]>;
  peerTables: Map<string, CategoryPeerTable>;
  globalQuartiles: { low: number; high: number };
}

export interface ModelConstants {
  category_clamp_low: number;
  category_clamp_high: number;
  min_comparables: number;
  global_median_fallback: number;
  winsor_low: number;
  winsor_high: number;
  size_exponent: number;
  size_factor_low: number;
  size_factor_high: number;
  growth_clamp: number;
  growth_weight: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_factor: number;
}

export interface ReputationSignalValues {
  s1: number | null;
  s2: number | null;
  s3: number | null;
  s4: number | null;
  s5: number | null;
  s6: number | null;
  s7: number | null;
  s8: number | null;
  had_incident: boolean | null;
  kill_no_audit_anon_eoa: boolean;
  kill_recent_uncompensated_exploit: boolean;
}

export interface RawReputationAudit {
  firms: string[];
  count: number | null;
  year: number | null;
  current_version: boolean | null;
}

export interface RawReputationExploit {
  date: string;
  usd_lost: number | null;
  compensated: boolean | null;
  postmortem: boolean | null;
}

export interface RawReputationAdmin {
  multisig: boolean | null;
  threshold: string | null;
  timelock: boolean | null;
  eoa_admin: boolean | null;
}

export interface RawReputationBounty {
  live: boolean | null;
  max_payout_usd: number | null;
}

export interface RawReputationEntry {
  slug: string;
  name: string;
  as_of: string;
  audit: RawReputationAudit | null;
  exploits: RawReputationExploit[];
  team_doxxed: string | null;
  admin_control: RawReputationAdmin | null;
  bounty: RawReputationBounty | null;
  github_active: boolean | null;
  sources: string[];
}

export interface ReputationTable {
  as_of: string;
  entries: Record<string, RawReputationEntry>;
}

const TIER1_FIRMS = [
  'trail of bits',
  'openzeppelin',
  'spearbit',
  'cantina',
  'chainsecurity',
  'consensys diligence',
];

const CURATOR_SLUGS = [
  'steakhouse-financial',
  'gauntlet',
  'nonce-capital',
  'galaxy-curation',
  'armitage-by-wintermute',
  'keyrock',
  'hyperithm',
  'clearstar',
  'gami-labs',
  'tulipa-capital',
];

export interface ReputationResult {
  r: number;
  m_rep: number;
  scores: Record<string, number>;
  unknown: string[];
  kill_switch: boolean;
  had_incident: boolean | null;
}

const REPUTATION_SIGNAL_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;
type ReputationSignalId = typeof REPUTATION_SIGNAL_IDS[number];

export const REPUTATION_WEIGHTS: Record<ReputationSignalId, number> = {
  s1: 0.20,
  s2: 0.20,
  s3: 0.10,
  s4: 0.15,
  s5: 0.10,
  s6: 0.15,
  s7: 0.05,
  s8: 0, // D14: unmeasured — no weight, never counted in completeness (n/7)
};

const ALL_UNKNOWN_SIGNALS: ReputationSignalValues = {
  s1: null,
  s2: null,
  s3: null,
  s4: null,
  s5: null,
  s6: null,
  s7: null,
  s8: null,
  had_incident: null,
  kill_no_audit_anon_eoa: false,
  kill_recent_uncompensated_exploit: false,
};

export const MODEL: ModelConstants = {
  category_clamp_low: 0.05,
  category_clamp_high: 1.5,
  min_comparables: 2,
  // Last resort only: used when NO tokened protocol exists at all. The model
  // reports the computed global median instead (D15) — never this constant.
  global_median_fallback: 0.21,
  winsor_low: 0.01,
  winsor_high: 10,
  size_exponent: -0.15,
  size_factor_low: 0.5,
  size_factor_high: 1.5,
  growth_clamp: 30,
  growth_weight: 0.8,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_factor: 0.85,
};

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export interface ImpliedValue {
  implied: number;
  categoryMultiple: number;
  sizeFactor: number;
  growthFactor: number;
  maturityFactor: number;
  age: number | null;
  reputation_score: number;
  reputation_multiplier: number;
  reputation_unknown: string[];
  reputation_kill_switch: boolean;
}

export interface BoardRow extends SnapshotProtocol {
  rank: number;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  reputation_score: number;
  reputation_multiplier: number;
  reputation_unknown: string[];
  reputation_kill_switch: boolean;
  // Per-signal scores (s1..s7, s8 = 0.5 neutral "tidak diukur"); unknown
  // signals carry the 0.5 default — display must use reputation_unknown
  // to show them as "tidak diketahui", never as a measured score.
  reputation_scores: Record<string, number>;
  model: {
    category_multiple: number;
    size_factor: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    reputation_score: number;
    reputation_multiplier: number;
  };
  farm_steps: string[];
}

export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  reputation_score: number;
  reputation_multiplier: number;
  reputation_unknown: string[];
  reputation_kill_switch: boolean;
  reputation_scores: Record<string, number>;
  category_multiple: number;
  size_factor: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: typeof MODEL_VERSION;
  global_multiple: number;
  category_multiples: Record<string, number>;
  peer_tables: Record<string, CategoryPeerTable>;
  watchlist: string[];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  comparables: Record<string, Comparable[]>;
  reputation_as_of: string | null;
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function reputationScore(
  signals: ReputationSignalValues,
  ageDaysValue: number | null,
): ReputationResult {
  // D14: S8 (age/retention) is unmeasured in the frozen reference table —
  // always null. It carries weight 0, is never counted in completeness
  // (n/7), and is shown as "tidak diukur", not as a scored signal.
  const scoredIds = REPUTATION_SIGNAL_IDS.filter((id) => id !== 's8');
  const scores: Record<string, number> = {};
  const unknown: string[] = [];
  for (const id of scoredIds) {
    const value = signals[id];
    if (isUnitScore(value)) {
      scores[id] = value;
    } else {
      scores[id] = 0.5;
      unknown.push(id);
    }
  }
  scores.s8 = 0.5;

  if (ageDaysValue !== null && ageDaysValue < 365) {
    scores.s2 = Math.min(scores.s2, 0.6);
  }

  let includedIds: readonly ReputationSignalId[] = scoredIds;
  if (signals.had_incident === false) {
    includedIds = scoredIds.filter((id) => id !== 's3');
  }

  let weightTotal = 0;
  let weightedSum = 0;
  for (const id of includedIds) {
    const weight = REPUTATION_WEIGHTS[id];
    weightTotal += weight;
    weightedSum += weight * scores[id];
  }
  const r = clamp(weightTotal === 0 ? 0.5 : weightedSum / weightTotal, 0, 1);
  const killSwitch =
    signals.kill_no_audit_anon_eoa === true ||
    signals.kill_recent_uncompensated_exploit === true;
  const mRep = killSwitch ? 0.5 : clamp(0.70 + 0.30 * r, 0.70, 1.00);

  return {
    r,
    m_rep: mRep,
    scores,
    unknown,
    kill_switch: killSwitch,
    had_incident: signals.had_incident,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isUnitScore(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function defaultReputation(): ReputationResult {
  return reputationScore(ALL_UNKNOWN_SIGNALS, null);
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quartile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next === undefined ? sorted[base]! : sorted[base]! + rest * (next - sorted[base]!);
}

function utcDay(value: string): number | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const endDay = utcDay(asOf);
  const startDay = utcDay(listedAt);
  if (endDay === null || startDay === null) return null;
  return Math.max(0, Math.floor((endDay - startDay) / 86400000));
}

export function isPreToken(protocol: SnapshotProtocol): boolean {
  return (
    protocol.mcap_usd === null &&
    protocol.gecko_id === null &&
    protocol.symbol === null
  );
}

const VERSION_MARKER = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

export function isRankable(protocol: SnapshotProtocol): boolean {
  return (
    isPreToken(protocol) &&
    protocol.category !== 'CEX' &&
    !VERSION_MARKER.test(protocol.name)
  );
}

export function categoryMultiples(snapshot: Snapshot): CategoryMultiples {
  // D13: a peer must have a recorded price (mcap > 0) and TVL > 0.
  // mcap 0 means "no price recorded", mcap < 0 is impossible (data error).
  const winsor = (ratio: number): number =>
    clamp(ratio, MODEL.winsor_low, MODEL.winsor_high);
  const tokened = snapshot.protocols.filter(
    (protocol) =>
      protocol.mcap_usd !== null && protocol.mcap_usd > 0 && protocol.tvl_usd > 0,
  );
  const globalRatios = tokened.map((protocol) =>
    winsor(protocol.mcap_usd! / protocol.tvl_usd),
  );
  const globalRatio = median(globalRatios);
  const global = globalRatio === null
    ? MODEL.global_median_fallback
    : clamp(globalRatio, MODEL.category_clamp_low, MODEL.category_clamp_high);
  // D17: quartiles from winsorized ratios; the global middle half is the
  // fallback range for categories with too few peers.
  const globalQuartiles = {
    low: clamp(quartile(globalRatios, 0.25) ?? global, MODEL.category_clamp_low, MODEL.category_clamp_high),
    high: clamp(quartile(globalRatios, 0.75) ?? global, MODEL.category_clamp_low, MODEL.category_clamp_high),
  };

  const byCategory = new Map<string, number>();
  const comparables = new Map<string, Comparable[]>();
  const peerTables = new Map<string, CategoryPeerTable>();
  const groups = new Map<string, Comparable[]>();

  for (const protocol of tokened) {
    const category = protocol.category;
    if (category === null) continue;
    const group = groups.get(category) ?? [];
    group.push({
      slug: protocol.slug,
      name: protocol.name,
      mcap_usd: protocol.mcap_usd!,
      tvl_usd: protocol.tvl_usd,
      ratio: winsor(protocol.mcap_usd! / protocol.tvl_usd),
    });
    groups.set(category, group);
  }

  for (const [category, group] of groups) {
    group.sort((left, right) => right.tvl_usd - left.tvl_usd || left.slug.localeCompare(right.slug));
    comparables.set(category, group.slice(0, 8));
    const ratios = group.map((item) => item.ratio);
    // D13: median of the category's own peers once n >= 2 (median of two
    // is their average); otherwise the computed global median — never the
    // 0.21 fallback constant (D15).
    const source: 'category' | 'global' =
      group.length < MODEL.min_comparables ? 'global' : 'category';
    const categoryRatio = source === 'global'
      ? global
      : median(ratios) ?? global;
    const multiple = clamp(categoryRatio, MODEL.category_clamp_low, MODEL.category_clamp_high);
    byCategory.set(category, multiple);
    peerTables.set(category, {
      category,
      multiple,
      peer_count: group.length,
      source,
      quartile_low: source === 'global'
        ? globalQuartiles.low
        : clamp(quartile(ratios, 0.25) ?? multiple, MODEL.category_clamp_low, MODEL.category_clamp_high),
      quartile_high: source === 'global'
        ? globalQuartiles.high
        : clamp(quartile(ratios, 0.75) ?? multiple, MODEL.category_clamp_low, MODEL.category_clamp_high),
      peers: group,
    });
  }

  return { byCategory, global, comparables, peerTables, globalQuartiles };
}

export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  categoryMultiple: number,
  reputation: ReputationResult | null = null,
): ImpliedValue {
  const rep = reputation ?? defaultReputation();
  const sizeFactor = clamp(
    Math.pow(Math.max(protocol.tvl_usd, 1) / 1e8, MODEL.size_exponent),
    MODEL.size_factor_low,
    MODEL.size_factor_high,
  );
  const growthFactor = protocol.change_7d === null
    ? 1.0
    : 1 + (clamp(protocol.change_7d, -MODEL.growth_clamp, MODEL.growth_clamp) / 100) * MODEL.growth_weight;
  const age = ageDays(asOf, protocol.listed_at);
  const maturityFactor = age === null
    ? MODEL.unknown_age_factor
    : MODEL.maturity_floor + MODEL.maturity_range * Math.min(age, MODEL.maturity_days) / MODEL.maturity_days;
  const implied = Math.max(
    1,
    Math.round(
      protocol.tvl_usd * categoryMultiple * sizeFactor * growthFactor * maturityFactor * rep.m_rep,
    ),
  );
  return {
    implied,
    categoryMultiple,
    sizeFactor,
    growthFactor,
    maturityFactor,
    age,
    reputation_score: rep.r,
    reputation_multiplier: rep.m_rep,
    reputation_unknown: [...rep.unknown],
    reputation_kill_switch: rep.kill_switch,
  };
}

function capitalFor(tvlUsd: number): string {
  if (tvlUsd >= 5e9) return '$250';
  if (tvlUsd >= 1e9) return '$150';
  if (tvlUsd >= 1e8) return '$100';
  return '$50';
}

function mainAction(protocol: SnapshotProtocol, chain: string): string {
  const category = protocol.category ?? '';
  const value = capitalFor(protocol.tvl_usd);
  if (/(lending|cdp|collateral|borrow)/i.test(category)) {
    return `Supply ${value} of USDC on ${chain} as collateral and keep the supply open.`;
  }
  if (/(curator|allocator|risk|vault)/i.test(category)) {
    return `Deposit ${value} of USDC into a vault on ${chain} and keep the vault shares.`;
  }
  if (/(dexs|yield|farming|farm|liquidity|basis|aggregator|index|amm)/i.test(category)) {
    return `Provide ${value} of liquidity to the main pool on ${chain} and keep the position open.`;
  }
  if (/bridge/i.test(category)) {
    return `Bridge ${value} of USDC through the protocol on ${chain} and leave funds at the destination.`;
  }
  if (/stak/i.test(category)) {
    return `Stake ${value} worth of the ${chain} staking asset and keep the stake open.`;
  }
  if (/(perp|deriv|synthet|option)/i.test(category)) {
    return `Deposit ${value} of USDC as margin on ${chain} and open one small hedge.`;
  }
  if (/prediction/i.test(category)) {
    return `Fund ${value} on ${chain} and place one market position.`;
  }
  if (/(stable|reserve|currency|anchor)/i.test(category)) {
    return `Mint or deposit ${value} of the stable asset on ${chain} and hold it.`;
  }
  if (/rwa/i.test(category)) {
    return `Mint ${value} of the yield asset on ${chain} and hold it.`;
  }
  if (/insurance/i.test(category)) {
    return `Buy ${value} of cover on ${chain} and keep the policy active.`;
  }
  return `Deposit ${value} of USDC on ${chain} and keep the position open.`;
}

function holdDays(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

export function farmSteps(protocol: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = protocol.chains.length > 0 ? protocol.chains[0] : 'its main chain';
  const days = holdDays(age);
  return [
    {
      text: 'Create a fresh wallet and store its seed phrase offline.',
      cost: '$0',
      time: '10 minutes',
    },
    {
      text: mainAction(protocol, chain),
      cost: capitalFor(protocol.tvl_usd),
      time: '20 minutes',
    },
    {
      text: 'Keep one qualifying action each week: deposit, borrow, swap or vote.',
      cost: 'Gas only',
      time: '5 minutes weekly',
    },
    {
      text: `Hold the position for at least ${days} days without withdrawing.`,
      cost: '$0',
      time: `${days} days`,
    },
    {
      text: 'Before withdrawing, open the protocol\'s own points or rewards page and claim only from the link it publishes; never pay to claim and treat no airdrop as promised.',
      cost: '$0',
      time: '15 minutes',
    },
    {
      text: 'Check the position and points weekly and keep a simple log of wallet, dates and transactions.',
      cost: '$0',
      time: '10 minutes weekly',
    },
    {
      text: 'Plan the unwind: choose how to exit the position and what to do if a token launches; check the protocol\'s own announcements and never connect a wallet to an unfamiliar claim site.',
      cost: 'Gas only',
      time: '20 minutes',
    },
  ];
}

export function stepText(step: FarmStep): string {
  const text = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (text.length > 600) return `${text.slice(0, 597)}...`;
  if (text.length < 20) return text.padEnd(20, ' ');
  return text;
}

function multipleFor(protocol: SnapshotProtocol, multiples: CategoryMultiples): number {
  if (protocol.category === null) return multiples.global;
  return multiples.byCategory.get(protocol.category) ?? multiples.global;
}

export function buildBoard(snapshot: Snapshot, reputation: ReputationTable | null = null): BoardRow[] {
  const multiples = categoryMultiples(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const reputationEntries = reputation?.entries ?? {};
  const seen = new Set<string>();
  const selected: SnapshotProtocol[] = [];
  for (const protocol of snapshot.protocols) {
    if (seen.has(protocol.slug)) continue;
    if (
      watchlist.has(protocol.slug) ||
      (isRankable(protocol) && protocol.tvl_usd < snapshot.floor_usd)
    ) {
      selected.push(protocol);
      seen.add(protocol.slug);
    }
  }
  const rows = selected.map((protocol) => {
    const age = ageDays(snapshot.as_of, protocol.listed_at);
    const entry = reputationEntries[protocol.slug];
    const rep = reputationScore(
      entry === undefined ? ALL_UNKNOWN_SIGNALS : signalsFromEntry(entry, reputation!.as_of),
      age,
    );
    const value = impliedValue(
      protocol,
      snapshot.as_of,
      multipleFor(protocol, multiples),
      rep,
    );
    return {
      ...protocol,
      rank: 0,
      token_status: 'pre-token' as const,
      age_days: age,
      implied_value_usd: value.implied,
      reputation_score: rep.r,
      reputation_multiplier: rep.m_rep,
      reputation_unknown: [...rep.unknown],
      reputation_kill_switch: rep.kill_switch,
      reputation_scores: { ...rep.scores },
      model: {
        category_multiple: round4(value.categoryMultiple),
        size_factor: round4(value.sizeFactor),
        growth_multiplier: round4(value.growthFactor),
        maturity_multiplier: round4(value.maturityFactor),
        age_days: age,
        reputation_score: rep.r,
        reputation_multiplier: rep.m_rep,
      },
      farm_steps: farmSteps(protocol, age).map(stepText),
    };
  });
  rows.sort((left, right) =>
    right.implied_value_usd - left.implied_value_usd || left.slug.localeCompare(right.slug),
  );
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((protocol) => !isPreToken(protocol) && protocol.category !== 'CEX')
    .sort((left, right) =>
      (right.mcap_usd ?? 0) - (left.mcap_usd ?? 0) || left.slug.localeCompare(right.slug),
    )
    .slice(0, 24)
    .map((protocol) => ({
      slug: protocol.slug,
      name: protocol.name,
      category: protocol.category,
      chains: protocol.chains,
      tvl_usd: protocol.tvl_usd,
      mcap_usd: protocol.mcap_usd,
      change_7d: protocol.change_7d,
    }));
}

export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    reputation_score: row.reputation_score,
    reputation_multiplier: row.reputation_multiplier,
    reputation_unknown: [...row.reputation_unknown],
    reputation_kill_switch: row.reputation_kill_switch,
    reputation_scores: { ...row.reputation_scores },
    category_multiple: row.model.category_multiple,
    size_factor: row.model.size_factor,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

export function buildRadar(snapshot: Snapshot, reputation: ReputationTable | null = null): RadarData {
  const board = buildBoard(snapshot, reputation);
  const multiples = categoryMultiples(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const comparables: Record<string, Comparable[]> = {};
  for (const row of board) {
    const group = row.category === null
      ? []
      : multiples.comparables.get(row.category) ?? [];
    comparables[row.slug] = group.slice(0, 5);
  }
  const live = liveRows(snapshot);
  const categoryMultiplesRecord: Record<string, number> = {};
  for (const [category, multiple] of multiples.byCategory) {
    categoryMultiplesRecord[category] = multiple;
  }
  const peerTablesRecord: Record<string, CategoryPeerTable> = {};
  for (const [category, table] of multiples.peerTables) {
    peerTablesRecord[category] = table;
  }
  return {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: { ...MODEL },
    model_version: MODEL_VERSION,
    global_multiple: multiples.global,
    category_multiples: categoryMultiplesRecord,
    peer_tables: peerTablesRecord,
    watchlist: [...snapshot.watchlist],
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((row) => !watchlist.has(row.slug)).length,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
    comparables,
    reputation_as_of: reputation?.as_of ?? null,
  };
}

function parseProtocol(value: unknown, index: number): SnapshotProtocol {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SnapshotError(`protocols[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.slug !== 'string' || typeof record.name !== 'string') {
    throw new SnapshotError(`protocols[${index}] needs string slug and name`);
  }
  if (!isFiniteNumber(record.tvl_usd)) {
    throw new SnapshotError(`protocols[${index}] needs a finite tvl_usd`);
  }
  const chains = Array.isArray(record.chains)
    ? record.chains.filter((chain): chain is string => typeof chain === 'string')
    : [];
  return {
    slug: record.slug,
    name: record.name,
    category: nullableString(record.category),
    chains,
    tvl_usd: record.tvl_usd,
    change_7d: isFiniteNumber(record.change_7d) ? record.change_7d : null,
    mcap_usd: isFiniteNumber(record.mcap_usd) ? record.mcap_usd : null,
    listed_at: nullableString(record.listed_at),
    gecko_id: nullableString(record.gecko_id),
    symbol: nullableString(record.symbol),
  };
}

export function parseSnapshot(text: string): Snapshot {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new SnapshotError('invalid JSON');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SnapshotError('snapshot must be an object');
  }
  const record = value as Record<string, unknown>;
  if (typeof record.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.as_of)) {
    throw new SnapshotError('as_of must be a YYYY-MM-DD string');
  }
  if (typeof record.source !== 'string') {
    throw new SnapshotError('source must be a string');
  }
  if (
    !Number.isSafeInteger(record.floor_usd) ||
    (record.floor_usd as number) <= 0
  ) {
    throw new SnapshotError('floor_usd must be a positive safe integer');
  }
  if (!Array.isArray(record.protocols)) {
    throw new SnapshotError('protocols must be an array');
  }
  if (
    !Array.isArray(record.watchlist) ||
    !record.watchlist.every((slug) => typeof slug === 'string')
  ) {
    throw new SnapshotError('watchlist must be an array of strings');
  }
  return {
    as_of: record.as_of,
    source: record.source,
    floor_usd: record.floor_usd as number,
    protocols: record.protocols.map(parseProtocol),
    watchlist: record.watchlist as string[],
  };
}

function reputationRecord(value: unknown, label: string): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new SnapshotError(`${label} must be an object or null`);
  }
  return value as Record<string, unknown>;
}

function reputationString(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new SnapshotError(`${label} must be a string or null`);
  return value;
}

function reputationBoolean(value: unknown, label: string): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') throw new SnapshotError(`${label} must be a boolean or null`);
  return value;
}

function reputationNumber(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null;
  if (!isFiniteNumber(value)) throw new SnapshotError(`${label} must be a number or null`);
  return value;
}

function reputationStringArray(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new SnapshotError(`${label} must be an array of strings`);
  }
  return value as string[];
}

function parseAudit(value: unknown, slug: string): RawReputationAudit | null {
  const record = reputationRecord(value, `${slug}.audit`);
  if (record === null) return null;
  return {
    firms: reputationStringArray(record.firms, `${slug}.audit.firms`),
    count: reputationNumber(record.count, `${slug}.audit.count`),
    year: reputationNumber(record.year, `${slug}.audit.year`),
    current_version: reputationBoolean(record.current_version, `${slug}.audit.current_version`),
  };
}

function parseExploit(value: unknown, slug: string, index: number): RawReputationExploit {
  const record = reputationRecord(value, `${slug}.exploits[${index}]`);
  if (record === null) throw new SnapshotError(`${slug}.exploits[${index}] must be an object`);
  if (typeof record.date !== 'string') {
    throw new SnapshotError(`${slug}.exploits[${index}].date must be a string`);
  }
  return {
    date: record.date,
    usd_lost: reputationNumber(record.usd_lost, `${slug}.exploits[${index}].usd_lost`),
    compensated: reputationBoolean(record.compensated, `${slug}.exploits[${index}].compensated`),
    postmortem: reputationBoolean(record.postmortem, `${slug}.exploits[${index}].postmortem`),
  };
}

function parseAdmin(value: unknown, slug: string): RawReputationAdmin | null {
  const record = reputationRecord(value, `${slug}.admin_control`);
  if (record === null) return null;
  return {
    multisig: reputationBoolean(record.multisig, `${slug}.admin_control.multisig`),
    threshold: reputationString(record.threshold, `${slug}.admin_control.threshold`),
    timelock: reputationBoolean(record.timelock, `${slug}.admin_control.timelock`),
    eoa_admin: reputationBoolean(record.eoa_admin, `${slug}.admin_control.eoa_admin`),
  };
}

function parseBounty(value: unknown, slug: string): RawReputationBounty | null {
  const record = reputationRecord(value, `${slug}.bounty`);
  if (record === null) return null;
  return {
    live: reputationBoolean(record.live, `${slug}.bounty.live`),
    max_payout_usd: reputationNumber(
      record.max_payout_usd,
      `${slug}.bounty.max_payout_usd`,
    ),
  };
}

function parseReputationEntry(value: unknown, index: number): RawReputationEntry {
  const label = `reputation[${index}]`;
  const record = reputationRecord(value, label);
  if (record === null) throw new SnapshotError(`${label} must be an object`);
  if (typeof record.slug !== 'string' || record.slug.length === 0) {
    throw new SnapshotError(`${label}.slug must be a non-empty string`);
  }
  if (typeof record.as_of !== 'string') {
    throw new SnapshotError(`${label}.as_of must be a string`);
  }
  if (!Array.isArray(record.exploits)) {
    throw new SnapshotError(`${label}.exploits must be an array`);
  }
  const slug = record.slug;
  return {
    slug,
    name: reputationString(record.name, `${label}.name`) ?? '',
    as_of: record.as_of,
    audit: parseAudit(record.audit, slug),
    exploits: record.exploits.map((exploit, exploitIndex) =>
      parseExploit(exploit, slug, exploitIndex),
    ),
    team_doxxed: reputationString(record.team_doxxed, `${label}.team_doxxed`),
    admin_control: parseAdmin(record.admin_control, slug),
    bounty: parseBounty(record.bounty, slug),
    github_active: reputationBoolean(record.github_active, `${label}.github_active`),
    sources: reputationStringArray(record.sources, `${label}.sources`),
  };
}

export function parseReputationTable(text: string): ReputationTable {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new SnapshotError('invalid reputation JSON');
  }
  if (!Array.isArray(value)) {
    throw new SnapshotError('reputation reference must be an array');
  }
  if (value.length === 0) {
    throw new SnapshotError('reputation reference must not be empty');
  }
  const entries: Record<string, RawReputationEntry> = {};
  value.forEach((item, index) => {
    const entry = parseReputationEntry(item, index);
    entries[entry.slug] = entry;
  });
  return { as_of: value[0].as_of as string, entries };
}

function auditScore(slug: string, audit: RawReputationAudit | null): number | null {
  if (slug === 'r25') return null;
  if (slug === 'noble') return 0;
  const isCurator = CURATOR_SLUGS.includes(slug);
  if (audit === null || (audit.firms.length === 0 && audit.count === null)) return null;
  if (isCurator) return audit.count !== null && audit.count > 0 ? null : 0;
  if (audit.count === 0) return 0;
  if (audit.current_version === false) return 0.1;
  if (audit.firms.length === 0) return null;
  const tier1 = audit.firms.filter((firm) => TIER1_FIRMS.includes(firm.trim().toLowerCase()));
  if (tier1.length >= 2) return 1.0;
  if (tier1.length === 1) return 0.7;
  return 0.4;
}

export function signalsFromEntry(entry: RawReputationEntry, asOf: string): ReputationSignalValues {
  const endDay = utcDay(asOf);
  const lossExploits = entry.exploits.filter((exploit) => exploit.usd_lost !== 0);
  const timedExploits = lossExploits
    .map((exploit) => {
      const day = endDay === null ? null : utcDay(exploit.date);
      return { exploit, days: day === null ? null : Math.floor((endDay - day) / 86400000) };
    })
    .filter((item): item is { exploit: RawReputationExploit; days: number } =>
      item.days !== null && item.days >= 0,
    );
  const hadIncident = timedExploits.length > 0;
  const recent = timedExploits.some((item) => item.days < 365);
  const killRecent = timedExploits.some(
    (item) => item.days < 365 && item.exploit.compensated === false,
  );

  const noPublishedEvidence =
    (entry.audit === null ||
      (entry.audit.firms.length === 0 && entry.audit.count === null)) &&
    entry.team_doxxed === null &&
    entry.github_active === null &&
    (entry.admin_control === null ||
      (entry.admin_control.multisig === null &&
        entry.admin_control.eoa_admin === null &&
        entry.admin_control.timelock === null)) &&
    (entry.bounty === null || entry.bounty.live === null);
  let s2 = noPublishedEvidence ? 0.5 : 1.0;
  if (hadIncident) {
    if (recent) {
      s2 = 0;
    } else if (timedExploits.length >= 2) {
      s2 = 0;
    } else if (timedExploits.some((item) => item.exploit.compensated === false)) {
      s2 = 0;
    } else if (timedExploits.some((item) => item.exploit.compensated === true)) {
      s2 = 0.3;
    } else {
      s2 = 0.5;
    }
  }

  let s3: number | null = null;
  if (hadIncident) {
    const latest = timedExploits.reduce((best, item) =>
      item.days < best.days ? item : best,
    ).exploit;
    if (latest.compensated === true) {
      s3 = latest.postmortem === true ? 0.7 : 0.5;
    } else if (latest.compensated === false) {
      s3 = latest.postmortem === true ? 0.5 : 0;
    } else {
      s3 = 0.5;
    }
  }

  let s4: number | null = null;
  if (entry.github_active === true) s4 = 0.6;
  else if (entry.github_active === false) s4 = 0.2;

  let s5: number | null = null;
  if (entry.team_doxxed === 'public') s5 = 0.7;
  else if (entry.team_doxxed === 'pseudonymous') s5 = 0.4;
  else if (entry.team_doxxed === 'anonymous') s5 = 0.1;

  const s1 = auditScore(entry.slug, entry.audit);
  let s6: number | null = null;
  if (entry.slug !== 'lightning-network') {
    const admin = entry.admin_control;
    if (entry.slug === 'curvance') {
      s6 = 0.6;
    } else if (admin !== null && admin.eoa_admin === true) {
      s6 = 0;
    } else if (admin !== null && admin.multisig === true && admin.timelock === true) {
      s6 = 1.0;
    } else if (admin !== null && admin.multisig === true) {
      s6 = 0.6;
    }
  }

  let s7: number | null = null;
  const bounty = entry.bounty;
  if (bounty !== null) {
    if (bounty.live === false) {
      s7 = 0;
    } else if (bounty.live === true) {
      if (CURATOR_SLUGS.includes(entry.slug)) {
        s7 = null;
      } else if (bounty.max_payout_usd !== null && bounty.max_payout_usd >= 500000) {
        s7 = 1.0;
      } else {
        s7 = 0.5;
      }
    }
  }

  return {
    s1,
    s2,
    s3,
    s4,
    s5,
    s6,
    s7,
    s8: null,
    had_incident: hadIncident,
    kill_no_audit_anon_eoa:
      s1 === 0 && entry.team_doxxed === 'anonymous' &&
      entry.admin_control !== null && entry.admin_control.eoa_admin === true,
    kill_recent_uncompensated_exploit: killRecent,
  };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const watchlist = new Set(snapshot.watchlist);
  for (const slug of watchlist) {
    if (!board.some((row) => row.slug === slug)) {
      return `missing watchlist slug: ${slug}`;
    }
  }
  for (let index = 0; index < board.length; index += 1) {
    const row = board[index];
    if (row.rank !== index + 1) {
      return `row ${index} has rank ${row.rank}, expected ${index + 1}`;
    }
    if (!Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd <= 0) {
      return `row ${row.rank} has an invalid implied value`;
    }
    if (index > 0 && row.implied_value_usd > board[index - 1].implied_value_usd) {
      return `row ${row.rank} breaks implied value ordering`;
    }
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `row ${row.rank} has ${row.farm_steps.length} farm steps`;
    }
    for (const step of row.farm_steps) {
      if (step.length < 20 || step.length > 600) {
        return `row ${row.rank} has a farm step outside 20..600 chars`;
      }
    }
  }
  if (board.length >= 2 && board.every((row) =>
    row.implied_value_usd === board[0].implied_value_usd,
  )) {
    return 'all implied values are equal';
  }
  return null;
}

export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
