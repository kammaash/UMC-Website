import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayDoses } from './TodayDoses'
import * as hook from './data/useTodayDoses'
import * as actions from './data/reminderDoses'
import type { Dose } from './data/doses'

vi.mock('./data/useTodayDoses', () => ({ useTodayDoses: vi.fn() }))
vi.mock('./data/reminderDoses', () => ({ markDoseTaken: vi.fn().mockResolvedValue(undefined) }))

const dose = (o: Partial<Dose>): Dose => ({
  tabletId: 't1', medicationName: 'Metformin 500 mg', dosage: '', scheduledTime: '8:00 AM', scheduledMinutes: 480,
  date: '2026-09-17', logId: 't1_2026-09-17_8-00_AM', reminderEnabled: true, lateWindowMinutes: 15, status: 'due', ...o,
})
const base = { loading: false, error: null, zone: 'Asia/Kolkata', dateLabel: 'Thu, 17 Sept', nowMinutes: 600 }

beforeEach(() => { vi.clearAllMocks() })

describe('TodayDoses', () => {
  it('lists doses with their time in the subtitle, a "no reminder" note, and a count — no separate status pill or time chip', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [
      dose({}), dose({ tabletId: 't2', logId: 't2_2026-09-17_9-00_AM', medicationName: 'Vitamin D', scheduledTime: '9:00 AM', status: 'taken', reminderEnabled: false }),
    ] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    expect(screen.getByText('Metformin 500 mg')).toBeInTheDocument()
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText(/No reminder/)).toBeInTheDocument()
    expect(screen.queryByText('Due')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 2 taken')).toBeInTheDocument()
    // every dose is the tap target itself; the taken one is a disabled button, not an actionable one
    expect(screen.getAllByRole('button', { name: /as taken/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Vitamin D at 9:00 AM, Taken/ })).toBeDisabled()
  })
  it('a dose with a dosage shows "dosage • time" in the subtitle', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({ dosage: '500 mg' })] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    expect(screen.getByText('500 mg • 8:00 AM')).toBeInTheDocument()
  })
  it('tapping the tile writes the log with the gid, uid, dose and current minutes', async () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({})] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    await userEvent.click(screen.getByRole('button', { name: /Metformin 500 mg at 8:00 AM as taken/ }))
    await waitFor(() => expect(actions.markDoseTaken).toHaveBeenCalledWith('G1', 'u1', expect.objectContaining({ logId: 't1_2026-09-17_8-00_AM' }), 600))
  })
  it('the whole tile is the tap target — a tap on its subtitle text marks it taken too', async () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({})] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    await userEvent.click(screen.getByText('8:00 AM'))
    await waitFor(() => expect(actions.markDoseTaken).toHaveBeenCalled())
  })
  it('a taken tile cannot be tapped again — the app blocks "untaking"', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({ status: 'taken' })] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    expect(screen.getByRole('button', { name: /Metformin 500 mg at 8:00 AM, Taken/ })).toBeDisabled()
  })
  it('uses the app status accents for taken-late (yellow) and missed (red) tiles', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [
      dose({ status: 'taken_late' }),
      dose({ tabletId: 't2', logId: 't2_x', medicationName: 'Vitamin D', status: 'missed' }),
    ] })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    const late = screen.getByRole('button', { name: /Metformin 500 mg.*Taken late/ })
    const missed = screen.getByRole('button', { name: /Mark Vitamin D.*as taken/ })
    expect(late).toHaveClass('is-taken_late')
    expect(late).toHaveStyle({ '--accent': 'var(--warning-700)' })
    expect(missed).toHaveClass('is-missed')
    expect(missed).toHaveStyle({ '--accent': 'var(--error)' })
  })
  it('shows an inline error when the write fails', async () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({})] })
    vi.mocked(actions.markDoseTaken).mockRejectedValueOnce(new Error('denied'))
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    await userEvent.click(screen.getByRole('button', { name: /as taken/ }))
    expect(await screen.findByText(/Couldn't save/)).toBeInTheDocument()
  })
  it('highlights the ?dose= row', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [dose({}), dose({ tabletId: 't2', logId: 't2_x', medicationName: 'Other' })] })
    Element.prototype.scrollIntoView = vi.fn()
    const { container } = render(<TodayDoses gid="G1" uid="u1" highlightLogId="t2_x" />)
    expect(container.querySelectorAll('.is-highlight')).toHaveLength(1)
    expect(container.querySelector('.is-highlight')!.textContent).toContain('Other')
  })
  it('empty and error states', () => {
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [] })
    const { unmount } = render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    expect(screen.getByText(/No medicines are scheduled/)).toBeInTheDocument()
    unmount()
    vi.mocked(hook.useTodayDoses).mockReturnValue({ ...base, doses: [], error: new Error('permission-denied') })
    render(<TodayDoses gid="G1" uid="u1" highlightLogId={null} />)
    expect(screen.getByText(/Couldn't load your medicines/)).toBeInTheDocument()
  })
})
