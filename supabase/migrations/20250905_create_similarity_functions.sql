-- Helper function: Calculate score between two notes (private)
CREATE OR REPLACE FUNCTION _calculate_pair_score(
    note_a_id uuid,
    note_b_id uuid,
    sim_weight float,
    citation_weight float,
    tag_weight float
)
RETURNS float AS '
DECLARE
    similarity float;
    citation_score int;
    tag_overlap_score float; -- Changed to float for jaccard-like score
    note_a_tags text[];
    note_b_tags text[];
    tag_intersection int;
    tag_union int;
BEGIN
    -- 1. Calculate embedding similarity
    SELECT avg(1 - (a.embedding <=> b.embedding))
    INTO similarity
    FROM note_chunks a
    CROSS JOIN note_chunks b
    WHERE a.note_id = note_a_id AND b.note_id = note_b_id;

    similarity := COALESCE(similarity, 0);

    -- 2. Calculate citation score
    SELECT count(*)::int
    INTO citation_score
    FROM note_links
    WHERE (from_note_id = note_a_id AND to_note_id = note_b_id)
       OR (from_note_id = note_b_id AND to_note_id = note_a_id);

    -- 3. Calculate Jaccard similarity for tags
    SELECT tags INTO note_a_tags FROM notes WHERE id = note_a_id;
    SELECT tags INTO note_b_tags FROM notes WHERE id = note_b_id;

    SELECT count(*) INTO tag_intersection FROM (
        SELECT unnest(note_a_tags) INTERSECT SELECT unnest(note_b_tags)
    ) as t;

    SELECT count(*) INTO tag_union FROM (
        SELECT unnest(note_a_tags) UNION SELECT unnest(note_b_tags)
    ) as t;

    IF tag_union = 0 THEN
        tag_overlap_score := 0;
    ELSE
        tag_overlap_score := tag_intersection::float / tag_union::float;
    END IF;

    -- 4. Combine scores with weights
    RETURN (similarity * sim_weight) + (citation_score * citation_weight) + (tag_overlap_score * tag_weight);
END;
' LANGUAGE plpgsql;

---

-- Public function: Get connected notes for a specific note
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
) AS '
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
        AND n.user_id = auth.uid() -- Enforces RLS
    ORDER BY
        score DESC
    LIMIT
        match_count;
END;
' LANGUAGE plpgsql;

---

-- Public function: Get all edges (connections) between all notes
CREATE OR REPLACE FUNCTION get_all_edges(
    sim_w float DEFAULT 0.7,
    citation_w float DEFAULT 0.2,
    tag_w float DEFAULT 0.1,
    minimum_weight float DEFAULT 0.02 -- New parameter
)
RETURNS TABLE (
    source uuid,
    target uuid,
    weight float
) AS '
BEGIN
    RETURN QUERY
    SELECT
        n1.id as source,
        n2.id as target,
        s.weight
    FROM
        notes n1
    JOIN
        notes n2 ON n1.id < n2.id
    CROSS JOIN LATERAL
        (SELECT _calculate_pair_score(n1.id, n2.id, sim_w, citation_w, tag_w) as weight) s
    WHERE
        n1.user_id = auth.uid() AND n2.user_id = auth.uid()
        AND s.weight >= minimum_weight; -- Filter here
END;
' LANGUAGE plpgsql;