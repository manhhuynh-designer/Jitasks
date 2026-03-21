-- Phase 1: Database Schema Update
-- Adding date range to task_groups table

ALTER TABLE public.task_groups 
ADD COLUMN start_date TIMESTAMPTZ, 
ADD COLUMN deadline TIMESTAMPTZ;

-- Optional: Update existing records with default values if needed
-- UPDATE public.task_groups SET start_date = now(), deadline = now() + interval '7 days' WHERE start_date IS NULL;
