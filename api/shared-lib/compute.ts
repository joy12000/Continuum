import type { Note, NoteChunk, NoteLink, PreparedNote, UUID } from "./types.js";
import { clamp01, mean, stddev } from "./utils.js";

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
  const sim = cosine(a.embedding, b.embedding); // 0..1
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
  return Math.max(0.35, Math.min(0.75, m + 0.15 * s));
}

export function cluster(prepared: PreparedNote[], edges: Edge[], threshold?: number) {
  const dsu = new DSU(prepared.length);
  const thr = threshold ?? autoThreshold(edges);
  for (const e of edges) if (e.score >= thr) dsu.u(e.i, e.j);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < prepared.length; i++) {
    const root = dsu.f(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }
  const clusters = [...groups.values()];
  return { clusters, threshold: thr };
}

export function clusterScore(indices: number[], edges: Edge[]): number {
  const set = new Set(indices.map((x) => x));
  const rel = edges.filter((e) => set.has(e.i) && set.has(e.j));
  if (!rel.length) return 0;
  return mean(rel.map((e) => e.score));
}

// ─────────────────────────── 인접 리스트 ───────────────────────────

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

// ─────────────────────────── LPA ───────────────────────────

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

  let changed = true;
  let iter = 0;
  while (changed && iter < maxIter) {
    changed = false;
    for (let i = 0; i < n; i++) {
      const neigh = adjWeak.get(i)!;
      if (!neigh.length) continue;

      const byLab = new Map<number, number>();
      for (const { j, w } of neigh) {
        const lj = label[j];
        byLab.set(lj, (byLab.get(lj) ?? 0) + w);
      }

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

  const map = new Map<number, number>();
  const clusters: number[][] = [];
  for (let i = 0; i < n; i++) {
    const lab = label[i];
    if (!map.has(lab)) { map.set(lab, clusters.length); clusters.push([]); }
    clusters[map.get(lab)!].push(i);
  }

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

// ───────────────────── DSU 임계 클러스터 & 모듈러리티 ─────────────────────

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

/** 가중 모듈러리티(정식식): Q = Σ_c ( l_c / m - (d_c / (2m))^2 ) */
function _modularityWeighted(n: number, edges: Edge[], clusters: number[][]) {
  const deg = new Array(n).fill(0);
  let m = 0;
  for (const e of edges) { deg[e.i] += e.score; deg[e.j] += e.score; m += e.score; }
  if (m === 0) return 0;

  let Q = 0;
  for (const c of clusters) {
    if (c.length === 0) continue;
    const S = new Set(c);
    let l_c = 0, d_c = 0;
    for (const i of c) d_c += deg[i];
    for (const e of edges) if (S.has(e.i) && S.has(e.j)) l_c += e.score;
    Q += (l_c / m) - Math.pow(d_c / (2 * m), 2);
  }
  return Q;
}

// ───────────────────── Auto-threshold (개수 보정 + MST fallback) ─────────────────────

export function clusterByAutoThreshold(
  prepared: PreparedNote[],
  edges: Edge[],
  opts?: { kMin?: number; kMax?: number; iters?: number; grid?: number }
) {
  const n = prepared.length;
  const kMin = opts?.kMin ?? 3;
  const kMax = opts?.kMax ?? 12;
  const iters = opts?.iters ?? 14;
  const grid  = opts?.grid ?? 8;

  const scores = edges.map(e => e.score).filter(Number.isFinite).sort((a,b) => a - b);
  if (scores.length === 0) return { clusters: [Array.from({ length: n }, (_, i) => i)], threshold: 1, Q: 0 };

  const q = (p: number) => scores[Math.min(scores.length - 1, Math.max(0, Math.floor(p * (scores.length - 1))))];

  // 넓은 구간에서 탐색
  let lo = q(0.30), hi = q(0.995);

  let bestThr = lo, bestClusters = _clusterByThreshold(n, edges, lo), bestQ = -Infinity;

  for (let t = 0; t < iters; t++) {
    const mid = (lo + hi) / 2;
    const cs = _clusterByThreshold(n, edges, mid);
    if (cs.length < kMin) hi = mid;
    else if (cs.length > kMax) lo = mid;
    else {
      const Q = _modularityWeighted(n, edges, cs);
      if (Q > bestQ) { bestQ = Q; bestThr = mid; bestClusters = cs; }
      lo = mid * 0.99; hi = mid * 1.01;
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

  if (bestClusters.length < kMin && n >= Math.max(2, kMin)) {
    const comps = forceSplitByMST(n, edges, kMin);
    return { clusters: comps, threshold: bestThr, Q: bestQ };
  }

  return { clusters: bestClusters, threshold: bestThr, Q: bestQ };
}

// ───────────────────── 고립·성기화·MST·흡수 ─────────────────────

export function detectIsolatedNodes(n: number, edges: Edge[], isoCut = 0.08): Set<number> {
  const maxW = new Array(n).fill(0);
  for (const e of edges) {
    if (e.score > maxW[e.i]) maxW[e.i] = e.score;
    if (e.score > maxW[e.j]) maxW[e.j] = e.score;
  }
  const iso = new Set<number>();
  for (let i = 0; i < n; i++) {
    const w = maxW[i];
    if (!Number.isFinite(w) || w < isoCut) iso.add(i);
  }
  return iso;
}

function _topKByNode(n: number, edges: Edge[], k: number) {
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

/** 상호 kNN + 최소 점수 컷으로 간선 성기화 */
export function sparsifyEdgesKNN(
  n: number,
  edges: Edge[],
  k = 8,
  { mutual = true, minScore = 0.08 }: { mutual?: boolean; minScore?: number } = {}
): Edge[] {
  if (edges.length === 0) return edges;
  const byNode = _topKByNode(n, edges, Math.max(1, k));
  const keep = new Set<string>();
  for (let i = 0; i < n; i++) {
    for (const { nb, w } of byNode.get(i)!) {
      if (w < minScore) continue;
      const a = Math.min(i, nb), b = Math.max(i, nb);
      keep.add(`${a}-${b}`);
    }
  }
  if (mutual) {
    const mutualKeep = new Set<string>();
    for (let i = 0; i < n; i++) {
      const A = new Set(byNode.get(i)!.map(x => x.nb));
      for (const { nb, w } of byNode.get(i)!) {
        if (w < minScore) continue;
        const B = new Set(byNode.get(nb)!.map(x => x.nb));
        if (A.has(nb) && B.has(i)) {
          const a = Math.min(i, nb), b = Math.max(i, nb);
          mutualKeep.add(`${a}-${b}`);
        }
      }
    }
    return edges.filter(e => mutualKeep.has(`${e.i}-${e.j}`));
  }
  return edges.filter(e => keep.has(`${e.i}-${e.j}`));
}

function _absorbSingletons(
  clusters: number[][],
  edges: Edge[],
  iso: Set<number>
): number[][] {
  const out: number[][] = [];
  const singles: number[] = [];
  for (const c of clusters) {
    if (c.length === 1 && !iso.has(c[0])) singles.push(c[0]);
    else out.push(c);
  }
  if (singles.length === 0 || out.length === 0) return [...out, ...singles.map(v => [v])];

  const adj = new Map<number, Array<{ j: number; w: number }>>();
  for (const e of edges) {
    if (!adj.has(e.i)) adj.set(e.i, []);
    if (!adj.has(e.j)) adj.set(e.j, []);
    adj.get(e.i)!.push({ j: e.j, w: e.score });
    adj.get(e.j)!.push({ j: e.i, w: e.score });
  }

  for (const v of singles) {
    let bestIdx = -1, bestSum = 0;
    const neigh = adj.get(v) ?? [];
    for (let ci = 0; ci < out.length; ci++) {
      const members = out[ci];
      let s = 0;
      for (const { j, w } of neigh) if (members.includes(j)) s += w;
      if (s > bestSum) { bestSum = s; bestIdx = ci; }
    }
    if (bestIdx >= 0 && bestSum > 0.05) out[bestIdx].push(v);
    else out.push([v]);
  }
  return out;
}

export function forceSplitByMST(n: number, edges: Edge[], k: number): number[][] {
  if (k <= 1 || n === 0) return [Array.from({ length: n }, (_, i) => i)];

  const dsu = new (class {
    p = Array.from({ length: n }, (_, i) => i);
    r = new Array(n).fill(0);
    f(x: number): number { return this.p[x] === x ? x : (this.p[x] = this.f(this.p[x])); }
    u(a: number, b: number): boolean {
      a = this.f(a); b = this.f(b);
      if (a === b) return false;
      if (this.r[a] < this.r[b]) [a, b] = [b, a];
      this.p[b] = a; if (this.r[a] === this.r[b]) this.r[a]++;
      return true;
    }
  })();

  const sorted = [...edges].sort((a, b) => b.score - a.score);
  const tree: Edge[] = [];
  for (const e of sorted) {
    if (tree.length === n - 1) break;
    if (dsu.u(e.i, e.j)) tree.push(e);
  }

  if (tree.length === 0) {
    return Array.from({ length: n }, (_, i) => [i]);
  }

  const cut = [...tree].sort((a, b) => a.score - b.score).slice(0, Math.max(0, k - 1));
  const cutSet = new Set(cut.map(e => `${Math.min(e.i, e.j)}-${Math.max(e.i, e.j)}`));

  const adj: Map<number, number[]> = new Map();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const e of tree) {
    const key = `${Math.min(e.i, e.j)}-${Math.max(e.i, e.j)}`;
    if (cutSet.has(key)) continue;
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
    comps.push(comp);
  }
  return comps;
}

// ───────────────────── 최종 개수 캡핑(하드 kMax 보장) ─────────────────────

function _maxIndexInClusters(clusters: number[][]): number {
  let mx = -1;
  for (const c of clusters) for (const v of c) if (v > mx) mx = v;
  return mx;
}

function _buildAdjMap(n: number, edges: Edge[]): Map<number, Map<number, number>> {
  const M = new Map<number, Map<number, number>>();
  for (let i = 0; i < n; i++) M.set(i, new Map());
  for (const e of edges) {
    if (!M.has(e.i) || !M.has(e.j)) continue; // 방어
    const a = M.get(e.i)!; a.set(e.j, (a.get(e.j) ?? 0) + e.score);
    const b = M.get(e.j)!; b.set(e.i, (b.get(e.i) ?? 0) + e.score);
  }
  return M;
}

function _sumToCluster(v: number, cluster: number[], adj: Map<number, Map<number, number>>): number {
  const row = adj.get(v) ?? new Map();
  let s = 0;
  for (const u of cluster) s += row.get(u) ?? 0;
  return s;
}

function _interAffinity(a: number[], b: number[], adj: Map<number, Map<number, number>>): number {
  if (!a.length || !b.length) return 0;
  let s = 0;
  for (const u of a) for (const v of b) s += (adj.get(u)?.get(v) ?? 0);
  return s / (a.length * b.length);
}

/** 클러스터 수를 kMax 이하로 강제 */
function capClusterCount(
  clustersIn: number[][],
  edges: Edge[],
  kMax: number,
  iso: Set<number>
): number[][] {
  let clusters = clustersIn.map(c => [...c]);
  if (clusters.length <= kMax) return clusters;

  // n은 "실제 최대 노드 인덱스 + 1"로 계산 (연속 가정 X)
  const n = _maxIndexInClusters(clusters) + 1;
  const adj = _buildAdjMap(n, edges);

  const absorbPhase = (absorbIso: boolean) => {
    let changed = true;
    while (changed && clusters.length > kMax) {
      changed = false;
      for (let i = 0; i < clusters.length && clusters.length > kMax; i++) {
        const c = clusters[i];
        if (c.length !== 1) continue;
        const v = c[0];
        if (!absorbIso && iso.has(v)) continue;

        let best = -1, bestSum = -Infinity;
        for (let j = 0; j < clusters.length; j++) {
          if (j === i) continue;
          const s = _sumToCluster(v, clusters[j], adj);
          if (s > bestSum) { bestSum = s; best = j; }
        }

        if (best >= 0 && bestSum > 0) {
          clusters[best].push(v);
          clusters.splice(i, 1);
          changed = true;
          i--;
        } else if (best === -1) {
          // 간선이 전혀 없으면 가장 큰 군집으로 강제 흡수 (무한 대기 방지)
          let tgt = -1, maxSize = -1;
          for (let j = 0; j < clusters.length; j++) {
            if (j === i) continue;
            if (clusters[j].length > maxSize) { maxSize = clusters[j].length; tgt = j; }
          }
          if (tgt >= 0) {
            clusters[tgt].push(v);
            clusters.splice(i, 1);
            changed = true;
            i--;
          }
        }
      }
    }
  };

  // 1) 비고립 싱글톤 먼저
  absorbPhase(false);

  // 2) 아직 넘치면 고립도
  if (clusters.length > kMax) absorbPhase(true);

  // 3) 그래도 넘치면 결속 최댓값 기준 병합, 없으면 최소 둘 병합
  while (clusters.length > kMax) {
    let bi = -1, bj = -1, best = -Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const s = _interAffinity(clusters[i], clusters[j], adj);
        if (s > best) { best = s; bi = i; bj = j; }
      }
    }
    if (bi < 0 || bj < 0) {
      clusters.sort((a, b) => a.length - b.length);
      if (clusters.length >= 2) {
        clusters[1] = clusters[1].concat(clusters[0]);
        clusters.splice(0, 1);
      } else {
        break;
      }
    } else {
      clusters[bi] = clusters[bi].concat(clusters[bj]);
      clusters.splice(bj, 1);
    }
  }
  return clusters;
}

// ───────────────────── 하이브리드 오케스트레이터 ─────────────────────

export function clusterHybrid(
  prepared: PreparedNote[],
  edgesAll: Edge[],
  pref?: {
    kMin?: number; kMax?: number;
    minEdge?: number; minClusterSize?: number;
    knnK?: number; mutual?: boolean;
    isoCut?: number;
  }
) {
  const n = prepared.length;
  const kMin = pref?.kMin ?? 3;
  const kMax = pref?.kMax ?? 12;
  const minEdge = pref?.minEdge ?? 0.05;
  const minClusterSize = pref?.minClusterSize ?? 2;
  const knnK = Math.min(pref?.knnK ?? 8, Math.max(1, n - 1)); // 유효범위 보호
  const mutual = pref?.mutual ?? true;
  const isoCut = pref?.isoCut ?? Math.max(0.02, Math.min(0.08, minEdge));

  // 0) 고립 감지
  const iso = detectIsolatedNodes(n, edgesAll, isoCut);

  // 1) 고립 간선 제거 후 kNN 성기화(간선 보존 완화형)
  const edgesDense = edgesAll.filter(e => !iso.has(e.i) && !iso.has(e.j));
  const edges = sparsifyEdgesKNN(
    n,
    edgesDense,
    knnK,
    { mutual, minScore: Math.max(0.005, minEdge * 0.5) }
  );

  // 2) LPA 1차
  const lpa = clusterLPA(prepared, edges, { minEdge, minClusterSize });
  let clusters = lpa.clusters;

  // 3) 개수 보정
  if (clusters.length < kMin || clusters.length > kMax) {
    const auto = clusterByAutoThreshold(prepared, edges, { kMin, kMax });
    clusters = auto.clusters;
  }

  // 4) 고립은 싱글톤으로 보장
  const inAny = new Array(n).fill(false);
  clusters.forEach(c => c.forEach(i => inAny[i] = true));
  for (let i = 0; i < n; i++) if (iso.has(i) && !inAny[i]) clusters.push([i]);

  // 5) 한 덩어리면 → 고립 제외 MST 강제 분할
  const nonIsoNodes = new Set<number>();
  for (let i = 0; i < n; i++) if (!iso.has(i)) nonIsoNodes.add(i);

  if (clusters.length === 1 && nonIsoNodes.size >= 2) {
    const idx = new Map<number, number>(), rev: number[] = [];
    Array.from(nonIsoNodes).forEach((v, p) => { idx.set(v, p); rev[p] = v; });
    const subEdges = edges.filter(e => idx.has(e.i) && idx.has(e.j))
                          .map(e => ({ i: idx.get(e.i)!, j: idx.get(e.j)!, score: e.score }));
    const desired = kMin - iso.size;
    const kTarget = Math.max(2, Math.min(desired > 0 ? desired : kMin, nonIsoNodes.size));
    const comps = forceSplitByMST(nonIsoNodes.size, subEdges, kTarget);
    clusters = [];
    for (const v of iso) clusters.push([v]);
    for (const comp of comps) clusters.push(comp.map(p => rev[p]));
  }

  // 6) 싱글톤 흡수(고립 제외)로 과분할 완화
  clusters = _absorbSingletons(clusters, edges.length ? edges : edgesAll, iso);

  // 7) ★최종 개수 하드 캡핑
  clusters = capClusterCount(clusters, edges.length ? edges : edgesAll, kMax, iso);

  // 8) 그래도 혹시 남아 있으면(이론상 거의 없음) — 가장 작은 군집부터 병합해 kMax 보장
  if (clusters.length > kMax) {
    clusters.sort((a,b) => a.length - b.length);
    while (clusters.length > kMax) {
      clusters[1] = clusters[1].concat(clusters[0]);
      clusters.splice(0, 1);
    }
  }

  // 9) 빈 군집 제거
  clusters = clusters.filter(c => c.length > 0);

  return { clusters, method: "hybrid+knn+isolation+absorb+cap" as const, meta: { knnK, mutual, isoCut } };
}
