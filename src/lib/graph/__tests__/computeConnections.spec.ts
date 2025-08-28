import { computeConnections } from "../computeConnections";

// test("태그/인용 기반 연결이 임베딩 없이도 동작", () => {
//   const notes = [
//     { id: "a", tags: ["x"], citations: [{ noteId: "b" }] },
//     { id: "b", tags: ["x"] },
//     { id: "c", tags: ["y"] },
//   ];
//   const vec = new Map();
//   // @ts-ignore
//   const res = computeConnections(notes[0], notes, vec, { citation:1, sim:0.6, tag:0.2 }, 3);
//   expect(res.find(r => r.toId === "b")).toBeTruthy();
// });