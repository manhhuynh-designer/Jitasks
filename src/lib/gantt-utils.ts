import { differenceInCalendarDays, startOfDay } from 'date-fns'

/**
 * Calculates the left percentage and width percentage for a Gantt bar
 * relative to a group's date range using millisecond precision.
 */
export const calculateGanttPercentages = (
  start: Date | string | null,
  end: Date | string | null,
  groupStart: Date | string | null,
  totalDays: number // Use the explicit number of day-columns for scale
) => {
  if (!groupStart || !totalDays || !end) return { left: 0, width: 0 }

  const gStart = new Date(new Date(groupStart).setHours(0, 0, 0, 0))
  // Total milliseconds in the view
  const groupDurationMs = totalDays * 24 * 60 * 60 * 1000

  const s = new Date(start ? new Date(start) : new Date(end))
  const e = new Date(end)

  // Calculate offset and duration in MS
  const msFromStart = s.getTime() - gStart.getTime()
  // Ensure duration is at least 1 day if dates are same
  const durationMs = Math.max(24 * 60 * 60 * 1000, e.getTime() - s.getTime() + (24 * 60 * 60 * 1000))

  // Convert to percentages relative to total grid time
  let left = (msFromStart / groupDurationMs) * 100
  let width = (durationMs / groupDurationMs) * 100

  // Clamping logic:
  // If task starts before group, left is 0 and width is reduced
  if (left < 0) {
    width += left
    left = 0
  }

  // If task ends after group, width is capped
  if (left + width > 100) {
    width = 100 - left
  }

  // Ensure minimum visibility of 2% if the task is within the range
  if (width < 2 && left >= 0 && left < 100) {
    width = 2
  }

  return {
    left: Math.max(0, Math.min(100, left)),
    width: Math.max(0, Math.min(100 - left, width)),
  }
}

/**
 * Calculates the bounding dates (min start, max end) for a set of tasks.
 */
export const calculateDateRange = (tasks: any[]) => {
  if (!tasks.length) return { start: null, end: null }
  
  let start: Date | null = null
  let end: Date | null = null
  
  tasks.forEach(task => {
    // Treat deadline as end date, and if no start date, use deadline as start date
    // or estimate based on duration if available. Here we use deadline for both if start is missing.
    const s = task.start_date ? new Date(task.start_date) : (task.deadline ? new Date(task.deadline) : null)
    const e = task.deadline ? new Date(task.deadline) : (task.start_date ? new Date(task.start_date) : null)
    
    if (s && (!start || s < start)) start = s
    if (e && (!end || e > end)) end = e
  })
  
  return { start, end }
}
