-- 특정 노트 ID 목록 내에서만 모든 엣지를 계산하는 함수
CREATE OR REPLACE FUNCTION get_edges_for_subgraph(
    p_note_ids uuid[],
    sim_w float DEFAULT 0.7,
    citation_w float DEFAULT 0.2,
    tag_w float DEFAULT 0.1
)
RETURNS TABLE (
    source uuid,
    target uuid,
    weight float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n1.id as source,
        n2.id as target,
        _calculate_pair_score(n1.id, n2.id, sim_w, citation_w, tag_w) as weight
    FROM
        notes n1
    JOIN
        notes n2 ON n1.id < n2.id
    WHERE
        n1.id = ANY(p_note_ids) AND n2.id = ANY(p_note_ids);
END;
$$ LANGUAGE plpgsql;
