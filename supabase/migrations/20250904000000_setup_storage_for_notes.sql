-- 1. 'notes-attachments' 이름으로 스토리지 버킷을 생성합니다.
-- public 옵션을 true로 설정하여 파일의 공개 URL을 생성할 수 있도록 합니다.
-- ON CONFLICT DO NOTHING: 이미 버킷이 존재하면 오류 없이 넘어갑니다.
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-attachments', 'notes-attachments', true)
ON CONFLICT (id) DO NOTHING;


-- 2. 파일 읽기(다운로드) 정책 설정
-- 'notes-attachments' 버킷에 있는 파일은 누구나 읽을 수 있도록 허용합니다.
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'notes-attachments' );


-- 3. 파일 업로드(추가) 정책 설정
-- 로그인한 사용자('authenticated' 역할)만 'notes-attachments' 버킷에 파일을 추가할 수 있습니다.
-- 또한, 파일 경로의 첫 번째 폴더 이름이 자신의 사용자 ID와 일치해야만 업로드할 수 있도록 제한합니다.
CREATE POLICY "Authenticated User Insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notes-attachments' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);


-- 4. 파일 수정 정책 설정
-- 'notes-attachments' 버킷에 있는 파일은 해당 파일의 소유자(owner)만 수정할 수 있습니다.
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
USING ( auth.uid() = owner )
WITH CHECK ( bucket_id = 'notes-attachments' );


-- 5. 파일 삭제 정책 설정
-- 'notes-attachments' 버킷에 있는 파일은 해당 파일의 소유자(owner)만 삭제할 수 있습니다.
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING ( auth.uid() = owner );

-- ------------------------------------------------------------------------
-- 6. 노트와 첨부파일 관계를 저장할 note_attachments 테이블을 생성합니다.
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL UNIQUE, -- 스토리지 내 파일 경로, 중복 방지
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. 성능 향상을 위해 user_id와 note_id에 인덱스를 생성합니다.
CREATE INDEX IF NOT EXISTS idx_note_attachments_user_id ON public.note_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);

-- 8. note_attachments 테이블에 Row Level Security (RLS)를 활성화합니다.
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- 9. note_attachments 테이블에 대한 정책들을 설정합니다.
-- 사용자는 자신의 첨부파일만 볼 수 있습니다.
CREATE POLICY "User can see their own attachments"
ON public.note_attachments FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 노트에 대한 첨부파일만 추가할 수 있습니다.
CREATE POLICY "User can insert their own attachments"
ON public.note_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 첨부파일만 수정할 수 있습니다.
CREATE POLICY "User can update their own attachments"
ON public.note_attachments FOR UPDATE
USING (auth.uid() = user_id);

-- 사용자는 자신의 첨부파일만 삭제할 수 있습니다.
CREATE POLICY "User can delete their own attachments"
ON public.note_attachments FOR DELETE
USING (auth.uid() = user_id);