// compute.ts — Balanced Greedy Graph Clustering (stable)
// 기존 API와 호환: prepareNotes, buildCitationSet, buildEdges, clusterScore,
// cluster (wrapper), clusterByAutoThreshold (wrapper), clusterHybrid (default),
// clusterLPA(원본 유지)

import type { Note, NoteChunk, NoteLink, PreparedNote, UUID } from "./types.js";
import { clamp01, mean, stddev } from "./utils.js";

export type Weights = { citation: number; sim: number; tag: number };

// ─────────────────────────── Embedding/유틸 ───────────────────────────
export function averageVectors(vecs: number[][]): number[] {
  if (vecs.length === 0) return [];
  const dim = vecs[0]?.length ?? 0;
  const out = new Array(dim).fill(0);
  for (const v of vecs) for (let i = 0; i < dim; i++) out[i] += v[i] ?? 0;
  const n = vecs.length;
  for (let i = 0; i < dim; i++) out[i] /= n;
  return out;
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; dot += x*y; na += x*x; nb += y*y; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function prepareNotes(notes: Note[], chunks: NoteChunk[]): PreparedNote[] {
  const byNote: Record<UUID, number[][]> = {};
  for (const ch of chunks) {
    if (!byNote[ch.note_id]) byNote[ch.note_id] = [];
    byNote[ch.note_id].push(ch.embedding);
  }
  return notes.map((n) => ({
    note: n,
    embedding: averageVectors(byNote[n.id] ?? []),
    tags: Array.isArray(n.tags) ? n.tags : []
  }));
}

export function tagOverlap(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  const inter = [...A].filter((x) => B.has(x)).length;
  const denom = Math.max(A.size, B.size);
  return denom === 0 ? 0 : inter / denom;
}

export function buildCitationSet(links: NoteLink[]): Set<string> {
  const s = new Set<string>();
  for (const l of links) s.add(`${l.from_note_id}→${l.to_note_id}`);
  return s;
}

export function pairScore(a: PreparedNote, b: PreparedNote, cites: Set<string>, w: Weights): number {
  const sim = cosine(a.embedding, b.embedding);
  const citation = (cites.has(`${a.note.id}→${b.note.id}`) || cites.has(`${b.note.id}→${a.note.id}`)) ? 1 : 0;
  const tag = tagOverlap(a.tags, b.tags);
  const raw = w.sim * sim + w.citation * citation + w.tag * tag;
  const maxW = w.sim + w.citation + w.tag || 1;
  return clamp01(raw / maxW);
}

export type Edge = { i: number; j: number; score: number };

export function buildEdges(
  prepared: PreparedNote[],
  cites: Set<string>,
  w: Weights,
  capPairs: number | null = null
): Edge[] {
  const edges: Edge[] = [];
  const n = prepared.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const score = pairScore(prepared[i], prepared[j], cites, w);
      edges.push({ i, j, score });
      if (capPairs && ++count >= capPairs) return edges;
    }
  }
  return edges;
}

class DSU {
  p: number[]; r: number[];
  constructor(n: number) { this.p = Array.from({ length: n }, (_, i) => i); this.r = new Array(n).fill(0); }
  f(x: number): number { return this.p[x] === x ? x : (this.p[x] = this.f(this.p[x])); }
  u(a: number, b: number) { a = this.f(a); b = this.f(b);
    if (a === b) return;
    if (this.r[a] < this.r[b]) [a, b] = [b, a];
    this.p[b] = a; if (this.r[a] === this.r[b]) this.r[a]++; }
}

// 평균 내부결속 스코어
export function clusterScore(indices: number[], edges: Edge[]): number {
  const set = new Set(indices);
  const rel = edges.filter((e) => set.has(e.i) && set.has(e.j));
  if (!rel.length) return 0;
  return mean(rel.map((e) => e.score));
}

// ─────────────────────────── 간선 정리(안정화) ───────────────────────────

function quantile(arr: number[], q: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
  return a[idx];
}

function detectIsolated(n: number, edges: Edge[], cut: number): Set<number> {
  const maxW = new Array(n).fill(0);
  for (const e of edges) { if (e.score > maxW[e.i]) maxW[e.i] = e.score; if (e.score > maxW[e.j]) maxW[e.j] = e.score; }
  const iso = new Set<number>();
  for (let i = 0; i < n; i++) if (!Number.isFinite(maxW[i]) || maxW[i] < cut) iso.add(i);
  return iso;
}

function topKByNode(n: number, edges: Edge[], k: number): Map<number, Array<{ nb: number; w: number }>> {
  const byNode: Map<number, Array<{ nb: number; w: number }>> = new Map();
  for (let i = 0; i < n; i++) byNode.set(i, []);
  for (const e of edges) {
    byNode.get(e.i)!.push({ nb: e.j, w: e.score });
    byNode.get(e.j)!.push({ nb: e.i, w: e.score });
  }
  for (let i = 0; i < n; i++) {
    const arr = byNode.get(i)!;
    arr.sort((a, b) => b.w - a.w);
    if (arr.length > k) arr.length = k;
  }
  return byNode;
}

/** 상호 Top-K + 분위수 기반 컷(적응형) */
function pruneEdgesAdaptive(
  n: number,
  edgesAll: Edge[],
  opt?: { topK?: number; mutual?: boolean; q?: number; floor?: number; isoCut?: number }
): { edges: Edge[]; iso: Set<number>; minScore: number } {
  const topK = Math.max(1, opt?.topK ?? 8);
  const mutual = opt?.mutual ?? true;
  const qv = Math.min(0.95, Math.max(0.4, opt?.q ?? 0.6));
  const floor = Math.max(0.0, opt?.floor ?? 0.02);
  const isoCut = Math.max(0.0, opt?.isoCut ?? 0.02);

  const scores = edgesAll.map(e => e.score).filter(Number.isFinite);
  const qCut = quantile(scores, qv) * 0.9;               // 약간 관대하게
  const minScore = Math.max(floor, isFinite(qCut) ? qCut : floor);

  // 약한 간선 컷(soft)
  const edgesSoft = edgesAll.filter(e => e.score >= minScore * 0.8);

  // 고립 후보
  const iso = detectIsolated(n, edgesSoft, isoCut);

  // 고립 제외 후 mutual Top-K
  const dense = edgesSoft.filter(e => !iso.has(e.i) && !iso.has(e.j));
  if (!dense.length) return { edges: [], iso, minScore };

  const byNode = topKByNode(n, dense, topK);
  const keep = new Set<string>();
  for (let i = 0; i < n; i++) for (const { nb, w } of byNode.get(i)!) if (w >= minScore) keep.add(`${Math.min(i, nb)}-${Math.max(i, nb)}`);

  if (mutual) {
    const M = new Set<string>();
    for (let i = 0; i < n; i++) {
      const A = new Set(byNode.get(i)!.map(x => x.nb));
      for (const { nb, w } of byNode.get(i)!) {
        if (w < minScore) continue;
        const B = new Set(byNode.get(nb)!.map(x => x.nb));
        if (A.has(nb) && B.has(i)) M.add(`${Math.min(i, nb)}-${Math.max(i, nb)}`);
      }
    }
    return { edges: dense.filter(e => M.has(`${e.i}-${e.j}`)), iso, minScore };
  }
  return { edges: dense.filter(e => keep.has(`${e.i}-${e.j}`)), iso, minScore };
}

// ─────────────────────────── 병합용 보조 ───────────────────────────

function buildAdjMap(n: number, edges: Edge[]): Map<number, Map<number, number>> {
  const M = new Map<number, Map<number, number>>();
  for (let i = 0; i < n; i++) M.set(i, new Map());
  for (const e of edges) {
    const a = M.get(e.i)!; a.set(e.j, (a.get(e.j) ?? 0) + e.score);
    const b = M.get(e.j)!; b.set(e.i, (b.get(e.i) ?? 0) + e.score);
  }
  return M;
}

function interSum(a: number[], b: number[], adj: Map<number, Map<number, number>>): number {
  let s = 0;
  for (const u of a) for (const v of b) s += adj.get(u)!.get(v) ?? 0;
  return s;
}

function interAvg(a: number[], b: number[], adj: Map<number, Map<number, number>>): number {
  if (!a.length || !b.length) return 0;
  return interSum(a, b, adj) / (a.length * b.length);
}

// 한 번에 2-way 컷(MST weakest edge)으로 큰 군집 쪼개기
function splitOnceByMST(cluster: number[], edges: Edge[]): number[][] {
  if (cluster.length <= 1) return [cluster];
  const idx = new Map<number, number>(), rev: number[] = [];
  cluster.forEach((v, p) => { idx.set(v, p); rev[p] = v; });

  const subEdges = edges
    .filter(e => idx.has(e.i) && idx.has(e.j))
    .map(e => ({ i: idx.get(e.i)!, j: idx.get(e.j)!, score: e.score }));

  // MST 만들고 가장 약한 간선 1개 컷
  const n = cluster.length;
  if (subEdges.length === 0) return [cluster]; // 내부 간선 없으면 쪼개기 불가

  const dsu = new DSU(n);
  const sorted = [...subEdges].sort((a,b) => b.score - a.score);
  const tree: Edge[] = [];
  for (const e of sorted) {
    if (tree.length === n - 1) break;
    if (dsu.u(e.i, e.j)) tree.push(e);
  }
  if (tree.length === 0) return [cluster];

  const weakest = [...tree].sort((a,b)=>a.score - b.score)[0];
  const cutKey = `${Math.min(weakest.i, weakest.j)}-${Math.max(weakest.i, weakest.j)}`;

  const adj: Map<number, number[]> = new Map();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const e of tree) {
    const key = `${Math.min(e.i, e.j)}-${Math.max(e.i, e.j)}`;
    if (key === cutKey) continue;
    adj.get(e.i)!.push(e.j);
    adj.get(e.j)!.push(e.i);
  }

  const seen = new Array(n).fill(false);
  const comps: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const stack = [i], comp: number[] = [];
    seen[i] = true;
    while (stack.length) {
      const v = stack.pop()!;
      comp.push(v);
      for (const nb of adj.get(v)!) if (!seen[nb]) { seen[nb] = true; stack.push(nb); }
    }
    comps.push(comp.map(p => rev[p]));
  }
  return comps;
}

// ─────────────────────────── 핵심: Balanced Greedy ───────────────────────────

/**
 * Balanced Greedy Graph Clustering
 * - 간선 정리(적응형) → 탐욕적 병합(average-link + 균형 패널티) → k범위 강제
 */
export function clusterBalanced(
  prepared: PreparedNote[],
  edgesAll: Edge[],
  opt?: {
    kMin?: number; kMax?: number;
    topK?: number; mutual?: boolean;
    q?: number; floor?: number; isoCut?: number;
    balancePenalty?: number;       // 0..1, 군집 크기 불균형 패널티 λ
  }
) {
  const n = prepared.length;
  const kMin = Math.max(1, opt?.kMin ?? 3);
  const kMax = Math.max(kMin, opt?.kMax ?? 12);

  // 1) 간선 정리(적응형)
  const { edges, iso, minScore } = pruneEdgesAdaptive(n, edgesAll, {
    topK: opt?.topK ?? 8,
    mutual: opt?.mutual ?? true,
    q: opt?.q ?? 0.6,
    floor: opt?.floor ?? 0.02,
    isoCut: opt?.isoCut ?? 0.02
  });

  // 시작 군집: 고립은 싱글톤으로, 나머지는 노드별 싱글톤
  const inIso = new Array(n).fill(false); for (const v of iso) inIso[v] = true;
  let clusters: number[][] = [];
  for (let i = 0; i < n; i++) clusters.push([i]);

  // 2) 탐욕적 병합
  const adj = buildAdjMap(n, edges);
  const λ = Math.min(1, Math.max(0, opt?.balancePenalty ?? 0.1));

  // 병합 스코어: avg-link - λ * size imbalance
  const scorePair = (a: number[], b: number[]) => {
    const avg = interAvg(a, b, adj);
    const imbalance = Math.abs(a.length - b.length) / (a.length + b.length); // 0..1
    return avg - λ * imbalance;
  };

  // 초기 모든 쌍 스코어 수집
  function bestPair(cls: number[][]): { i: number; j: number; s: number } | null {
    let bi = -1, bj = -1, best = -Infinity;
    for (let i = 0; i < cls.length; i++) {
      for (let j = i + 1; j < cls.length; j++) {
        const s = scorePair(cls[i], cls[j]);
        if (s > best) { best = s; bi = i; bj = j; }
      }
    }
    return bi < 0 ? null : { i: bi, j: bj, s: best };
  }

  // 병합 컷(적응형): 현재 가능한 쌍들의 중앙값 정도
  function currentCut(cls: number[][]): number {
    const vals: number[] = [];
    for (let i = 0; i < cls.length; i++)
      for (let j = i + 1; j < cls.length; j++)
        vals.push(scorePair(cls[i], cls[j]));
    if (!vals.length) return 0;
    const m = quantile(vals, 0.5); // median
    return m * 0.95;               // 살짝 완화
  }

  // 실제 병합 루프
  let guard = 20000;
  while (guard-- > 0 && clusters.length > 1) {
    const pair = bestPair(clusters);
    if (!pair) break;
    const cut = currentCut(clusters);

    // 규칙:
    // - 군집 수가 kMax 초과인 동안엔 무조건 병합(최대에서 안정적으로 내려오게)
    // - kMin..kMax 범위에 들어오면, best score가 cut 이상일 때만 병합(과분할/과병합 모두 방지)
    const mustMerge = clusters.length > kMax;
    const shouldMerge = mustMerge || (pair.s >= cut && pair.s >= minScore * 0.5);

    if (!shouldMerge) break;

    // 병합 실행
    const a = clusters[pair.i], b = clusters[pair.j];
    const merged = a.concat(b);
    const kept: number[][] = [];
    for (let t = 0; t < clusters.length; t++) if (t !== pair.i && t !== pair.j) kept.push(clusters[t]);
    kept.push(merged);
    clusters = kept;

    // 목표 범위에 들어왔고 더 이상 이득 없으면 멈춤
    if (clusters.length <= kMax && clusters.length >= kMin) {
      const next = bestPair(clusters);
      if (!next) break;
      const nextCut = currentCut(clusters);
      if (next.s < nextCut) break;
    }
  }

  // 3) k 범위 강제: 부족하면 쪼개기, 넘치면 병합
  // 3-1 부족(<kMin): 가장 큰 군집부터 MST 약한 간선 컷으로 2-way split 반복
  guard = 10000;
  while (guard-- > 0 && clusters.length < kMin) {
    let idx = -1, biggest = -1;
    for (let i = 0; i < clusters.length; i++) if (clusters[i].length > biggest) { biggest = clusters[i].length; idx = i; }
    if (idx < 0 || biggest <= 1) break;
    const parts = splitOnceByMST(clusters[idx], edges);
    if (parts.length <= 1) break;
    clusters.splice(idx, 1, ...parts);
  }

  // 3-2 넘침(>kMax): 결속도 큰 순으로 병합 (간선 없어도 크기 기반 폴백)
  guard = 10000;
  while (guard-- > 0 && clusters.length > kMax) {
    let bi = -1, bj = -1, best = -Infinity;
    const hasEdges = edges.length > 0;
    if (hasEdges) {
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const s = interAvg(clusters[i], clusters[j], adj);
          if (s > best) { best = s; bi = i; bj = j; }
        }
      }
    }
    if (!hasEdges || bi < 0 || bj < 0) {
      clusters.sort((a, b) => a.length - b.length);
      if (clusters.length <= 1) break;
      clusters[1] = clusters[1].concat(clusters[0]);
      clusters.splice(0, 1);
    } else {
      clusters[bi] = clusters[bi].concat(clusters[bj]);
      clusters.splice(bj, 1);
    }
  }

  // 정리
  clusters = clusters.filter(c => c.length > 0);
  return { clusters, method: "balanced" as const };
}

// ─────────────────────────── 호환 래퍼들 ───────────────────────────

// 단순 DSU + autoThr(레거시) 대신 balanced 호출
export function autoThreshold(edges: Edge[]): number {
  if (edges.length === 0) return 0.5;
  const scores = edges.map(e => e.score).filter(x => isFinite(x));
  const m = mean(scores), s = stddev(scores);
  return Math.max(0.35, Math.min(0.75, m + 0.15 * s));
}

export function cluster(prepared: PreparedNote[], edges: Edge[], threshold?: number) {
  // threshold 무시하고 balanced로 통일(안정성 우선)
  return clusterBalanced(prepared, edges, { kMin: 3, kMax: 12 });
}

// 기존 LPA는 남겨둠(호환용). 필요 시 여전히 사용할 수 있음.
function _buildAdj(n: number, edges: Edge[], minW = 0): Map<number, Array<{ j: number; w: number }>> {
  const adj = new Map<number, Array<{ j: number; w: number }>>();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const e of edges) { if (e.score < minW) continue; adj.get(e.i)!.push({ j: e.j, w: e.score }); adj.get(e.j)!.push({ j: e.i, w: e.score }); }
  return adj;
}
export function clusterLPA(
  prepared: PreparedNote[],
  edges: Edge[],
  opts?: { maxIter?: number; minEdge?: number; minClusterSize?: number }
) {
  const n = prepared.length;
  const maxIter = opts?.maxIter ?? 20;
  const minEdge = opts?.minEdge ?? 0.05;
  const minClusterSize = opts?.minClusterSize ?? 2;
  const adjWeak = _buildAdj(n, edges, minEdge);
  const label = Array.from({ length: n }, (_, i) => i);
  let changed = true, iter = 0;
  while (changed && iter < maxIter) {
    changed = false;
    for (let i = 0; i < n; i++) {
      const neigh = adjWeak.get(i)!; if (!neigh.length) continue;
      const byLab = new Map<number, number>();
      for (const { j, w } of neigh) { const lj = label[j]; byLab.set(lj, (byLab.get(lj) ?? 0) + w); }
      let bestLab = label[i], best = -Infinity;
      for (const [lab, sum] of byLab) if (sum > best || (sum === best && lab < bestLab)) { best = sum; bestLab = lab; }
      if (bestLab !== label[i]) { label[i] = bestLab; changed = true; }
    }
    iter++;
  }
  const map = new Map<number, number>(), clusters: number[][] = [];
  for (let i = 0; i < n; i++) { const lab = label[i]; if (!map.has(lab)) { map.set(lab, clusters.length); clusters.push([]); } clusters[map.get(lab)!].push(i); }
  // 작은 군집 흡수
  if (minClusterSize > 1) {
    const adjFull = _buildAdj(n, edges, 0);
    const node2cid = new Map<number, number>();
    clusters.forEach((c, cid) => c.forEach(v => node2cid.set(v, cid)));
    for (let cid = 0; cid < clusters.length; cid++) {
      const c = clusters[cid]; if (c.length >= minClusterSize) continue;
      for (const v of [...c]) {
        const byCid = new Map<number, number>();
        for (const { j, w } of adjFull.get(v)!) {
          const ocid = node2cid.get(j)!; if (ocid === cid) continue;
          byCid.set(ocid, (byCid.get(ocid) ?? 0) + w);
        }
        let bestCid = cid, best = -Infinity;
        for (const [k, s] of byCid) if (s > best) { best = s; bestCid = k; }
        if (bestCid !== cid) {
          clusters[cid] = clusters[cid].filter(x => x !== v);
          clusters[bestCid].push(v);
          node2cid.set(v, bestCid);
        }
      }
    }
  }
  return { clusters: clusters.filter(c => c.length > 0) };
}

// auto → balanced with k-range
export function clusterByAutoThreshold(
  prepared: PreparedNote[],
  edges: Edge[],
  opts?: { kMin?: number; kMax?: number }
) {
  const kMin = Math.max(1, opts?.kMin ?? 3);
  const kMax = Math.max(kMin, opts?.kMax ?? 12);
  return clusterBalanced(prepared, edges, { kMin, kMax });
}

// 기본 진입점(추천): balanced with 조금 보수적 파라미터
export function clusterHybrid(
  prepared: PreparedNote[],
  edgesAll: Edge[],
  pref?: { kMin?: number; kMax?: number; topK?: number; mutual?: boolean; q?: number; floor?: number; isoCut?: number; balancePenalty?: number }
) {
  return clusterBalanced(prepared, edgesAll, {
    kMin: pref?.kMin ?? 4,
    kMax: pref?.kMax ?? 12,
    topK: pref?.topK ?? 8,
    mutual: pref?.mutual ?? true,
    q: pref?.q ?? 0.6,
    floor: pref?.floor ?? 0.02,
    isoCut: pref?.isoCut ?? 0.02,
    balancePenalty: pref?.balancePenalty ?? 0.1
  });
}
