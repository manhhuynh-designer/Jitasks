import { differenceInDays } from 'date-fns'

/**
 * Calculates the left percentage and width percentage for a Gantt bar
 * relative to a group's date range.
 */
export const calculateGanttPercentages = (
  start: Date | string | null,
  end: Date | string | null,
  groupStart: Date | string | null,
  groupEnd: Date | string | null
) => {
  if (!groupStart || !groupEnd || !end) return { left: 0, width: 0 }

  const gStart = new Date(groupStart)
  const gEnd = new Date(groupEnd)
  // Ensure duration is at least 1 day to avoid division by zero
  const groupDuration = Math.max(1, differenceInDays(gEnd, gStart) + 1)

  const s = start ? new Date(start) : new Date(end)
  const e = new Date(end)

  // Calculate days from group start
  const daysFromStart = differenceInDays(s, gStart)
  const taskDuration = Math.max(1, differenceInDays(e, s) + 1)

  // Convert to percentages
  let left = (daysFromStart / groupDuration) * 100
  let width = (taskDuration / groupDuration) * 100

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
