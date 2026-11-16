ALTER TABLE public.submissions ADD COLUMN event_end_date date;
UPDATE public.submissions SET event_end_date = event_date WHERE event_end_date IS NULL;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_event_date_order CHECK (event_end_date IS NULL OR event_end_date >= event_date);
CREATE OR REPLACE FUNCTION public.refresh_event(_event_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d_start date; d_end date; deps public.department[];
BEGIN
 SELECT min(s.a), max(s.b) INTO d_start,d_end FROM (
  SELECT event_date AS a, coalesce(event_end_date,event_date) AS b FROM public.submissions WHERE event_id=_event_id
  UNION ALL SELECT coalesce(start_date,end_date),coalesce(end_date,start_date) FROM public.requests WHERE event_id=_event_id AND (start_date IS NOT NULL OR end_date IS NOT NULL)
 ) s;
 SELECT coalesce(array_agg(DISTINCT department ORDER BY department),'{}') INTO deps FROM public.requests WHERE event_id=_event_id;
 UPDATE public.events e SET departments=deps,start_date=CASE WHEN d_start IS NULL THEN e.start_date WHEN e.source='import' THEN least(e.start_date,d_start) ELSE d_start END,end_date=CASE WHEN d_end IS NULL THEN e.end_date WHEN e.source='import' THEN greatest(e.end_date,d_end) ELSE d_end END,updated_at=now() WHERE e.id=_event_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.staff_calendar_events() RETURNS TABLE(id uuid,name text,start_date date,end_date date,departments public.department[],can_open boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT e.id,e.name,e.start_date,e.end_date,e.departments,(public.has_role(auth.uid(),'master') OR coalesce(public.user_department(auth.uid()) = ANY(e.departments),false)) FROM public.events e WHERE public.is_staff(auth.uid()) ORDER BY e.start_date,e.name;
$$;
REVOKE ALL ON FUNCTION public.staff_calendar_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_calendar_events() TO authenticated;
COMMENT ON FUNCTION public.staff_calendar_events() IS 'Staff-only calendar metadata; does not expose contact details, descriptions, attachments or department request contents.';