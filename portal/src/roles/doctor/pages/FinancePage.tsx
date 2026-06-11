import { useState } from 'react'
import {
  Page, PageHeader, SectionHeading, Card, Button, Stat, Row,
  EmptyState, Loading, Money,
} from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { formatTimestamp, shortOrderId } from './format'
import {
  useFinanceSummary, useFinanceTransactions,
  usePendingPenalties, useCompletedPenalties,
} from '../data/useFinance'
import { settlePenalty } from '../data/financeActions'
import type { FinanceTransaction, PenaltyRecord } from '../data/types'

/* Accent palette — mirrors the Flutter app's teal / orange / red. */
const TEAL = '#00897B'
const ORANGE = '#EF6C00'
const ORANGE_STAT = '#FB8C00'
const RED = '#E53935'
const GREEN = '#43A047'

type Tab = 'revenue' | 'pending' | 'penalties'

const SUBTITLES: Record<Tab, string> = {
  revenue: 'Completed Payouts',
  pending: 'Held Payouts',
  penalties: 'Penalty Record',
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('revenue')

  return (
    <Page>
      <PageHeader eyebrow="Finances" title="Finances" subtitle={SUBTITLES[tab]} />

      <div className="umc-tabs" role="tablist">
        <button className={`umc-tab${tab === 'revenue' ? ' on' : ''}`} onClick={() => setTab('revenue')}>
          <Icon name="trendingUp" size={16} /> Revenue
        </button>
        <button className={`umc-tab${tab === 'pending' ? ' on' : ''}`} onClick={() => setTab('pending')}>
          <Icon name="hourglass" size={16} /> Pending
        </button>
        <button className={`umc-tab${tab === 'penalties' ? ' on' : ''}`} onClick={() => setTab('penalties')}>
          <Icon name="warning" size={16} /> Penalties
        </button>
      </div>

      {tab === 'revenue' && <RevenueTab />}
      {tab === 'pending' && <PendingTab />}
      {tab === 'penalties' && <PenaltiesTab />}
    </Page>
  )
}

/* ── Revenue ───────────────────────────────────────────────────── */
function RevenueTab() {
  const summary = useFinanceSummary()
  const txns = useFinanceTransactions()
  const [openId, setOpenId] = useState<string | null>(null)

  if (summary.loading || txns.loading) return <Loading />

  return (
    <>
      <Card>
        <div className="umc-grid c2">
          <Stat
            icon={<Icon name="payments" size={15} />}
            accent={TEAL}
            value={<Money value={summary.data?.totalRevenue ?? 0} />}
            label="Revenue"
          />
          <Stat
            icon={<Icon name="checkCircle" size={15} />}
            accent={TEAL}
            value={summary.data?.completedOrders ?? 0}
            label="Completed"
          />
        </div>
      </Card>

      {txns.data.length === 0 ? (
        <EmptyState
          icon={<Icon name="paymentsOutline" size={64} />}
          title="No completed payouts yet"
        />
      ) : (
        <>
          <SectionHeading>Completed Consultations</SectionHeading>
          <div className="umc-stack">
            {txns.data.map((t) => (
              <TransactionCard
                key={t.id}
                t={t}
                open={openId === t.id}
                onToggle={() => setOpenId(openId === t.id ? null : t.id)}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function TransactionCard({ t, open, onToggle }: { t: FinanceTransaction; open: boolean; onToggle: () => void }) {
  const isCompensation = t.type === 'cancellation_compensation'
  const amountColor = isCompensation ? ORANGE : TEAL

  return (
    <Card pressable onClick={onToggle}>
      <div className="umc-row" style={{ padding: 0, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            Consultation
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
            {formatTimestamp(t.createdAt)}{isCompensation ? ' · Compensation' : ''}
          </div>
        </div>
        <Money value={t.netAmount} style={{ fontWeight: 700, fontSize: 16, color: amountColor }} />
      </div>

      {open && (
        <>
          <hr className="umc-divider" style={{ margin: '12px 0' }} />
          <Row label="Order" value={shortOrderId(t.orderId)} />
          <Row label="Gross" value={<Money value={t.grossAmount} />} />
          {t.penaltyDeducted > 0 && (
            <Row label="Penalty Deducted" value={<>−<Money value={t.penaltyDeducted} /></>} valueColor={RED} />
          )}
          <Row label="You Received" value={<Money value={t.netAmount} />} valueColor={TEAL} />
        </>
      )}
    </Card>
  )
}

/* ── Pending ───────────────────────────────────────────────────── */
/*
 * NOTE: the phone app's richer pending list merges in-progress escrow
 * appointments (appointments where escrowHeld=true & status in
 * ['active','arrived']) with KYC-held payouts (doctors/{uid}.heldPayoutAmount
 * / heldPayoutOrderIds). Neither of those reads exists in this portal's data
 * layer yet, so we show summary-only here and defer the escrow detail list to
 * a later phase.
 */
function PendingTab() {
  const summary = useFinanceSummary()

  if (summary.loading) return <Loading />

  const s = summary.data
  const inProgress = s
    ? Math.max(0, (s.totalOrders ?? 0) - (s.completedOrders ?? 0) - (s.cancelledOrders ?? 0))
    : 0

  return (
    <>
      <Card>
        <div className="umc-grid c2">
          <Stat
            icon={<Icon name="hourglass" size={15} />}
            accent={ORANGE_STAT}
            value={<Money value={s?.outstandingPenalty ?? 0} />}
            label="Outstanding"
          />
          <Stat
            icon={<Icon name="receipt" size={15} />}
            accent={ORANGE_STAT}
            value={inProgress}
            label="In progress"
          />
        </div>
      </Card>

      <EmptyState
        icon={<Icon name="hourglass" size={64} />}
        title="No pending items to show"
        subtitle="Pending escrow detail arrives in a later phase."
      />
    </>
  )
}

/* ── Penalties ─────────────────────────────────────────────────── */
function PenaltiesTab() {
  const summary = useFinanceSummary()
  const pending = usePendingPenalties()
  const completed = useCompletedPenalties()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (summary.loading || pending.loading || completed.loading) return <Loading />

  const outstanding = summary.data?.outstandingPenalty ?? 0

  async function onSettle(id: string) {
    if (busyId) return
    setBusyId(id)
    try {
      await settlePenalty(id)
    } catch (err) {
      console.error('settlePenalty failed', err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Card>
        <div className="umc-grid c2">
          <Stat
            icon={<Icon name="warning" size={15} />}
            accent={outstanding > 0 ? RED : GREEN}
            value={<Money value={outstanding} />}
            label="Outstanding"
          />
          <Stat
            icon={<Icon name="receipt" size={15} />}
            accent={RED}
            value={pending.data.length}
            label="Penalties"
          />
        </div>
      </Card>

      {pending.data.length === 0 && completed.data.length === 0 ? (
        <EmptyState
          icon={<Icon name="checkCircle" size={64} />}
          title="No penalties on record"
        />
      ) : (
        <>
          {pending.data.length > 0 && (
            <>
              <SectionHeading>Outstanding Penalties</SectionHeading>
              <div className="umc-stack">
                {pending.data.map((p) => (
                  <PenaltyCard
                    key={p.id}
                    p={p}
                    settled={false}
                    open={openId === p.id}
                    onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                    busy={busyId === p.id}
                    onSettle={() => onSettle(p.id)}
                  />
                ))}
              </div>
            </>
          )}

          {completed.data.length > 0 && (
            <>
              <SectionHeading muted>Settled Penalties</SectionHeading>
              <div className="umc-stack">
                {completed.data.map((p) => (
                  <PenaltyCard
                    key={p.id}
                    p={p}
                    settled
                    open={openId === p.id}
                    onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

function PenaltyCard({ p, settled, open, onToggle, busy, onSettle }: {
  p: PenaltyRecord
  settled: boolean
  open: boolean
  onToggle: () => void
  busy?: boolean
  onSettle?: () => void
}) {
  const total = p.penaltyAmount + p.umcFee
  const amountColor = settled ? 'var(--ink-faint)' : RED

  return (
    <Card pressable onClick={onToggle} style={settled ? { opacity: 0.6 } : undefined}>
      <div className="umc-row" style={{ padding: 0, alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--ink)',
              textDecoration: settled ? 'line-through' : 'none',
            }}
          >
            Cancellation Penalty
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
            {formatTimestamp(p.createdAt)}
          </div>
        </div>
        <span
          className="umc-money"
          style={{
            fontWeight: 700, fontSize: 16, color: amountColor,
            textDecoration: settled ? 'line-through' : 'none',
          }}
        >
          −<Money value={total} />
        </span>
      </div>

      {open && (
        <>
          <hr className="umc-divider" style={{ margin: '12px 0' }} />
          <Row label="Order" value={shortOrderId(p.orderId)} />
          <Row label="Penalty" value={<>−<Money value={p.penaltyAmount} /></>} valueColor={settled ? undefined : RED} />
          <Row label="Fee" value={<Money value={p.umcFee} />} />
          {!settled && onSettle && (
            <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
              <Button sm variant="solid" accent={RED} loading={busy} onClick={onSettle}>
                Pay Now
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
