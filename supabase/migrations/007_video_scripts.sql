-- Video scripts + render status
CREATE TABLE public.video_scripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  script_json   JSONB NOT NULL DEFAULT '{}',
  video_url     TEXT,
  render_status TEXT NOT NULL DEFAULT 'pending'
                CHECK (render_status IN ('pending', 'rendering', 'ready', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.video_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read video scripts for own chapters"
  ON public.video_scripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON s.id = c.subject_id
      WHERE c.id = chapter_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages video scripts"
  ON public.video_scripts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_video_scripts_chapter_id ON public.video_scripts(chapter_id);
CREATE INDEX idx_video_scripts_render_status ON public.video_scripts(render_status);

CREATE TRIGGER video_scripts_updated_at
  BEFORE UPDATE ON public.video_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
