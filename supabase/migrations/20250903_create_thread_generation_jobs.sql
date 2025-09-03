
CREATE TABLE "public"."thread_generation_jobs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "status" text NOT NULL DEFAULT 'pending'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT thread_generation_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT thread_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."thread_generation_jobs" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "service_role";

-- Add RLS policies
ALTER TABLE "public"."thread_generation_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own jobs" ON "public"."thread_generation_jobs" FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
