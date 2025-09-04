import type { Note, NoteChunk, NoteLink, PreparedNote, UUID } from "./types.js";
import { clamp01, mean, stddev, unique } from "./utils.js";

export type Weights = { citation: number; sim: number; tag: number };

export function averageVectors(vecs: number[][]): number[] {
  if (vecs.length === 0) return [];
  const dim = vecs[0]?.length ?? 0;
  const out = new Array(dim).fill(0);
  for (const v of vecs) {
    for (let i = 0; i < dim; i++) out[i] += v[i] ?? 0;
  }
  const n = vecs.length;
  for (let i = 0; i < dim; i++) out[i] /= n;
  return out;
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y; na += x * x; nb += y * y;
  }
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
  if (denom === 0) return 0;
  return inter / denom;
}

export function buildCitationSet(links: NoteLink[]): Set<string> {
  const s = new Set<string>();
  for (const l of links) {
    s.add(`${l.from_note_id}→${l.to_note_id}`);
  }
  return s;
}

export function pairScore(
  a: PreparedNote,
  b: PreparedNote,
  cites: Set<string>,
  w: Weights
): number {
  const sim = cosine(a.embedding, b.embedding); // 0..1 (approx)
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
      count++;
      if (capPairs && count >= capPairs) return edges;
    }
  }
  return edges;
}

class DSU {
  p: number[];
  r: number[];
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = new Array(n).fill(0);
  }
  f(x: number): number { return this.p[x] === x ? x : (this.p[x] = this.f(this.p[x])); }
  u(a: number, b: number) {
    a = this.f(a); b = this.f(b);
    if (a === b) return;
    if (this.r[a] < this.r[b]) [a, b] = [b, a];
    this.p[b] = a;
    if (this.r[a] === this.r[b]) this.r[a]++;
  }
}

export function autoThreshold(edges: Edge[]): number {
  if (edges.length === 0) return 0.5;
  const scores = edges.map((e) => e.score).filter((x) => isFinite(x));
  const m = mean(scores);
  const s = stddev(scores);
  // baseline 0.35, nudge by distribution
  return Math.max(0.35, Math.min(0.75, m + 0.15 * s));
}

export function cluster(prepared: PreparedNote[], edges: Edge[], threshold?: number) {
  const dsu = new DSU(prepared.length);
  const thr = threshold ?? autoThreshold(edges);
  for (const e of edges) {
    if (e.score >= thr) dsu.u(e.i, e.j);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < prepared.length; i++) {
    const root = dsu.f(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }
  // Filter tiny groups of size 1 that have no strong edges; still keep singletons as micro-threads
  const clusters = [...groups.values()];
  return { clusters, threshold: thr };
}

export function clusterScore(indices: number[], edges: Edge[]): number {
  // average of internal edges
  const set = new Set(indices.map((x) => x));
  const rel = edges.filter((e) => set.has(e.i) && set.has(e.j));
  if (!rel.length) return 0;
  const avg = mean(rel.map((e) => e.score));
  return avg;
}

// === [ADD] LPA(라벨 전파) + 자동 임계값 + 하이브리드 클러스터러 =====================

// 내부용 인접리스트 생성
function _buildAdj(n: number, edges: Edge[], minW = 0): Map<number, Array<{ j: number; w: number }>> {
  const adj = new Map<number, Array<{ j: number; w: number }>>();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const e of edges) {
    if (e.score < minW) continue;
    adj.get(e.i)!.push({ j: e.j, w: e.score });
    adj.get(e.j)!.push({ j: e.i, w: e.score });
  }
  return adj;
}

/**
 * 파라미터-프리 가중치 라벨 전파(Label Propagation).
 * - 임계값(커트라인) 없이, 이웃 라벨 가중치합이 최대인 라벨로 갈아탐
 * - 너무 작은 군집은 강한 이웃 군집으로 흡수
 * - 순서 셔플을 쓰지 않아 **결과가 결정적(Deterministic)** 이도록 구성
 */
export function clusterLPA(
  prepared: PreparedNote[],
  edges: Edge[],
  opts?: { maxIter?: number; minEdge?: number; minClusterSize?: number }
) {
  const n = prepared.length;
  const maxIter = opts?.maxIter ?? 20;
  const minEdge = opts?.minEdge ?? 0.05;      // 너무 약한 간선 컷
  const minClusterSize = opts?.minClusterSize ?? 2;

  const adjWeak = _buildAdj(n, edges, minEdge);
  const label = Array.from({ length: n }, (_, i) => i);

  let changed = true;
  let iter = 0;
  while (changed && iter < maxIter) {
    changed = false;
    // 결정적 순회(셔플 없음)
    for (let i = 0; i < n; i++) {
      const neigh = adjWeak.get(i)!;
      if (!neigh.length) continue;

      // 이웃 라벨별 가중치 합
      const byLab = new Map<number, number>();
      for (const { j, w } of neigh) {
        const lj = label[j];
        byLab.set(lj, (byLab.get(lj) ?? 0) + w);
      }

      // 최댓값 라벨 선택(동점일 때 라벨 id가 작은 쪽 채택 → 결정성)
      let bestLab = label[i], best = -Infinity;
      for (const [lab, sum] of byLab) {
        if (sum > best || (sum === best && lab < bestLab)) {
          best = sum; bestLab = lab;
        }
      }
      if (bestLab !== label[i]) { label[i] = bestLab; changed = true; }
    }
    iter++;
  }

  // 라벨→클러스터
  const map = new Map<number, number>();
  const clusters: number[][] = [];
  for (let i = 0; i < n; i++) {
    const lab = label[i];
    if (!map.has(lab)) { map.set(lab, clusters.length); clusters.push([]); }
    clusters[map.get(lab)!].push(i);
  }

  // 너무 작은 군집은 강한 이웃 군집으로 흡수
  if (minClusterSize > 1) {
    const adjFull = _buildAdj(n, edges, 0);
    const node2cid = new Map<number, number>();
    clusters.forEach((c, cid) => c.forEach(v => node2cid.set(v, cid)));

    for (let cid = 0; cid < clusters.length; cid++) {
      const c = clusters[cid];
      if (c.length >= minClusterSize) continue;

      for (const v of [...c]) {
        const byCid = new Map<number, number>();
        for (const { j, w } of adjFull.get(v)!) {
          const ocid = node2cid.get(j)!;
          if (ocid === cid) continue;
          byCid.set(ocid, (byCid.get(ocid) ?? 0) + w);
        }
        // 가장 강하게 붙어있는 군집으로 이동
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

// ---- 자동 임계값(이분 탐색 + 모듈러리티로 품질 선택) ---------------------

function _clusterByThreshold(n: number, edges: Edge[], thr: number) {
  const dsu = new DSU(n);
  for (const e of edges) if (e.score >= thr) dsu.u(e.i, e.j);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = dsu.f(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }
  return [...groups.values()];
}

// 가중 그래프 모듈러리티(높을수록 내부가 조밀하고 외부와 느슨)
function _modularityWeighted(n: number, edges: Edge[], clusters: number[][]) {
  const deg = new Array(n).fill(0);
  let twoM = 0;
  for (const e of edges) {
    deg[e.i] += e.score;
    deg[e.j] += e.score;
    twoM += 2 * e.score;
  }
  if (twoM === 0) return 0;

  let Q = 0;
  for (const c of clusters) {
    if (c.length === 0) continue;
    let M_in_c = 0;
    let D_c = 0;
    const nodeSet = new Set(c);
    for (const i of c) {
      D_c += deg[i];
    }
    for (const e of edges) {
      if (nodeSet.has(e.i) && nodeSet.has(e.j)) {
        // 간선이 클러스터 내부에 완전히 포함될 경우
        if (e.i === e.j) {
          M_in_c += e.score; // self-loop
        } else {
          M_in_c += e.score;
        }
      }
    }
    // M_in_c는 내부 간선 가중치의 합입니다. 루프가 없으므로 2를 곱할 필요가 없습니다.
    // D_c는 클러스터 내 노드들의 총 차수(degree) 합입니다.
    Q += (M_in_c / twoM) - Math.pow(D_c / twoM, 2);
  }
  return Q;
}

/**
 * 목표 군집 수 범위를 만족하도록 임계값을 자동 탐색하고,
 * 그 범위 안에서 모듈러리티(Q)가 최대인 해를 선택.
 */
export function clusterByAutoThreshold(
  prepared: PreparedNote[],
  edges: Edge[],
  opts?: { kMin?: number; kMax?: number; iters?: number; grid?: number }
) {
  const n = prepared.length;
  const kMin = opts?.kMin ?? 3;
  const kMax = opts?.kMax ?? 12;
  const iters = opts?.iters ?? 12;
  const grid  = opts?.grid ?? 6;

  const scores = edges.map(e => e.score).filter(Number.isFinite).sort((a,b) => a - b);
  if (scores.length === 0) return { clusters: [Array.from({ length: n }, (_, i) => i)], threshold: 1, Q: 0 };

  const q = (p: number) => scores[Math.min(scores.length - 1, Math.max(0, Math.floor(p * (scores.length - 1))))];
  let lo = q(0.4), hi = q(0.98);

  let bestThr = lo, bestClusters = _clusterByThreshold(n, edges, lo), bestQ = -Infinity;

  for (let t = 0; t < iters; t++) {
    const mid = (lo + hi) / 2;
    const cs = _clusterByThreshold(n, edges, mid);
    if (cs.length < kMin) hi = mid;           // 너무 적게 나눠짐 → 임계 ↑
    else if (cs.length > kMax) lo = mid;      // 너무 많이 쪼개짐 → 임계 ↓
    else {
      const Q = _modularityWeighted(n, edges, cs);
      if (Q > bestQ) { bestQ = Q; bestThr = mid; bestClusters = cs; }
      lo = mid * 0.98; hi = mid * 1.02;       // 근방 탐색
    }
  }

  const center = (lo + hi) / 2;
  const step = (hi - lo) / Math.max(1, grid);
  for (let g = -grid; g <= grid; g++) {
    const thr = Math.min(1, Math.max(0, center + g * step));
    const cs = _clusterByThreshold(n, edges, thr);
    if (cs.length >= kMin && cs.length <= kMax) {
      const Q = _modularityWeighted(n, edges, cs);
      if (Q > bestQ) { bestQ = Q; bestThr = thr; bestClusters = cs; }
    }
  }

  return { clusters: bestClusters, threshold: bestThr, Q: bestQ };
}

/**
 * 하이브리드 오케스트레이터:
 *  - 1차 LPA로 빠르게 클러스터링
 *  - 결과 군집 수가 [kMin, kMax] 밖이면 자동 임계값 방식으로 보정
 */
export function clusterHybrid(
  prepared: PreparedNote[],
  edges: Edge[],
  pref?: { kMin?: number; kMax?: number; minEdge?: number; minClusterSize?: number }
) {
  const kMin = pref?.kMin ?? 3;
  const kMax = pref?.kMax ?? 12;
  const minEdge = pref?.minEdge ?? 0.05;
  const minClusterSize = pref?.minClusterSize ?? 2;

  const lpa = clusterLPA(prepared, edges, { minEdge, minClusterSize });
  const k = lpa.clusters.length;

  if (k < kMin || k > kMax) {
    const auto = clusterByAutoThreshold(prepared, edges, { kMin, kMax });
    return { clusters: auto.clusters, method: "auto-threshold" as const, threshold: auto.threshold };
  }
  return { clusters: lpa.clusters, method: "lpa" as const };
}