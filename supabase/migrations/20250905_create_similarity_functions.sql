
-- 헬퍼 함수: 두 노트 사이의 점수 계산 (비공개용)
CREATE OR REPLACE FUNCTION _calculate_pair_score(
    note_a_id uuid,
    note_b_id uuid,
    sim_weight float,
    citation_weight float,
    tag_weight float
)
RETURNS float AS $
DECLARE
    similarity float;
    citation_score int;
    tag_overlap_score int;
    note_a_tags text[];
    note_b_tags text[];
BEGIN
    -- 1. 임베딩 유사도 계산
    SELECT avg(1 - (a.embedding <=> b.embedding))
    INTO similarity
    FROM note_chunks a
    JOIN note_chunks b ON a.note_id = note_a_id AND b.note_id = note_b_id;

    -- 유사도가 없으면 0점
    similarity := COALESCE(similarity, 0);

    -- 2. 인용 점수 계산
    SELECT count(*)::int
    INTO citation_score
    FROM note_links
    WHERE (from_note_id = note_a_id AND to_note_id = note_b_id)
       OR (from_note_id = note_b_id AND to_note_id = note_a_id);

    -- 3. 태그 점수 계산
    SELECT tags INTO note_a_tags FROM notes WHERE id = note_a_id;
    SELECT tags INTO note_b_tags FROM notes WHERE id = note_b_id;
    
    SELECT count(*)::int
    INTO tag_overlap_score
    FROM (
        SELECT unnest(note_a_tags)
        INTERSECT
        SELECT unnest(note_b_tags)
    ) as common_tags;

    -- 4. 최종 점수 조합
    RETURN (similarity * sim_weight) + (citation_score * citation_weight) + (tag_overlap_score * tag_weight);
END;
$ LANGUAGE plpgsql;

-- 공개 함수: 특정 노트와 관련된 노트 목록 반환
CREATE OR REPLACE FUNCTION get_connections_for_note(
    target_note_id uuid,
    sim_w float DEFAULT 0.7,
    citation_w float DEFAULT 0.2,
    tag_w float DEFAULT 0.1,
    match_count int DEFAULT 50
)
RETURNS TABLE (
    note_id uuid,
    title text,
    score float
) AS $
BEGIN
    RETURN QUERY
    SELECT
        n.id as note_id,
        n.title,
        _calculate_pair_score(target_note_id, n.id, sim_w, citation_w, tag_w) as score
    FROM
        notes n
    WHERE
        n.id != target_note_id
        AND n.user_id = auth.uid() -- RLS 준수
    ORDER BY
        score DESC
    LIMIT
        match_count;
END;
$ LANGUAGE plpgsql;

-- 공개 함수: 모든 노트 간의 관계(edge) 목록 반환
CREATE OR REPLACE FUNCTION get_all_edges(
    sim_w float DEFAULT 0.7,
    citation_w float DEFAULT 0.2,
    tag_w float DEFAULT 0.1
)
RETURNS TABLE (
    source uuid,
    target uuid,
    weight float
) AS $
BEGIN
    RETURN QUERY
    SELECT
        n1.id as source,
        n2.id as target,
        _calculate_pair_score(n1.id, n2.id, sim_w, citation_w, tag_w) as weight
    FROM
        notes n1
    JOIN
        notes n2 ON n1.id < n2.id -- 중복 계산 방지 (n1-n2와 n2-n1은 같음)
    WHERE
        n1.user_id = auth.uid() AND n2.user_id = auth.uid(); -- RLS 준수
END;
$ LANGUAGE plpgsql;
