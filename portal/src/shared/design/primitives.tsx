import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react'

/* ── Page shell ────────────────────────────────────────────────── */
export function Page({ children, reveal = true }: { children: ReactNode; reveal?: boolean }) {
  return <div className={`umc-page${reveal ? ' umc-reveal' : ''}`}>{children}</div>
}

export function PageHeader({ eyebrow, title, subtitle, action, large }: {
  eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; large?: boolean
}) {
  return (
    <div className="umc-page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div>
        {eyebrow && <p className="umc-eyebrow">{eyebrow}</p>}
        <h1 className={`umc-title${large ? ' lg' : ''}`}>{title}</h1>
        {subtitle && <p className="umc-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionHeading({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <h2 className={`umc-section-h${muted ? ' muted' : ''}`}>{children}</h2>
}

/* ── Card ──────────────────────────────────────────────────────── */
export function Card({ children, section, flat, pressable, onClick, style, className }: {
  children: ReactNode; section?: boolean; flat?: boolean; pressable?: boolean
  onClick?: () => void; style?: CSSProperties; className?: string
}) {
  return (
    <div
      className={`umc-card${section ? ' section' : ''}${flat ? ' flat' : ''}${pressable ? ' pressable' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick} style={style}
    >
      {children}
    </div>
  )
}

/* ── Button ────────────────────────────────────────────────────── */
type BtnVariant = 'primary' | 'tonal' | 'solid' | 'outline' | 'ghost'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; accent?: string; sm?: boolean; pill?: boolean; full?: boolean
  loading?: boolean; icon?: ReactNode
}
export function Button({
  variant = 'primary', accent, sm, pill, full, loading, icon, children, style, disabled, ...rest
}: BtnProps) {
  const cls = `umc-btn ${variant}${sm ? ' sm' : ''}${pill ? ' pill' : ''}${full ? ' full' : ''}`
  const onDark = variant === 'primary' || variant === 'solid'
  return (
    <button className={cls} style={{ ...(accent ? { ['--accent' as string]: accent } : {}), ...style }} disabled={disabled || loading} {...rest}>
      {loading ? <span className={`umc-spin${onDark ? ' on-dark' : ''}`} /> : (<>{icon}{children}</>)}
    </button>
  )
}

/* ── Status badge ──────────────────────────────────────────────── */
export function Badge({ label, accent, dot, sm }: { label: string; accent: string; dot?: boolean; sm?: boolean }) {
  return (
    <span className={`umc-badge${sm ? ' sm' : ''}`} style={{ ['--accent' as string]: accent }}>
      {dot && <span className="umc-dot" />}{label}
    </span>
  )
}

/* ── Stat tile ─────────────────────────────────────────────────── */
export function Stat({ icon, value, label, accent, small }: {
  icon?: ReactNode; value: ReactNode; label: string; accent?: string; small?: boolean
}) {
  return (
    <div className="umc-stat">
      {icon && <span className="umc-stat-ico" style={accent ? { ['--accent' as string]: accent } : undefined}>{icon}</span>}
      <span className={`umc-stat-val${small ? ' sm' : ''}`} style={accent ? { color: accent } : undefined}>{value}</span>
      <span className="umc-stat-lab">{label}</span>
    </div>
  )
}

/* ── Detail row ────────────────────────────────────────────────── */
export function Row({ label, value, valueColor }: { label: string; value: ReactNode; valueColor?: string }) {
  return (
    <div className="umc-row">
      <span className="umc-row-lab">{label}</span>
      <span className="umc-row-val" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  )
}

/* ── Inputs ────────────────────────────────────────────────────── */
export function Field({ label, error, children }: { label?: string; error?: boolean; children: ReactNode }) {
  return (
    <div className={`umc-field${error ? ' error' : ''}`}>
      {label && <label className="umc-field-lab">{label}</label>}
      {children}
    </div>
  )
}

/* ── Empty state ───────────────────────────────────────────────── */
export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="umc-empty">
      {icon && <span className="umc-empty-ico">{icon}</span>}
      <p className="umc-empty-t">{title}</p>
      {subtitle && <p className="umc-empty-s">{subtitle}</p>}
    </div>
  )
}

/* ── Loading ───────────────────────────────────────────────────── */
export function Loading() {
  return <div className="umc-center"><span className="umc-spin" /></div>
}

/* ── Money formatter (₹, Indian grouping, no decimals by default) ─ */
export function formatINR(n: number | null | undefined, decimals = 0): string {
  const v = typeof n === 'number' ? n : 0
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
export function Money({ value, decimals, style }: { value: number | null | undefined; decimals?: number; style?: CSSProperties }) {
  return <span className="umc-money" style={style}>{formatINR(value, decimals)}</span>
}

/* ── Modal ─────────────────────────────────────────────────────── */
export function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode
}) {
  return (
    <div className="umc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="umc-modal">
        <h2 className="umc-modal-t">{title}</h2>
        {subtitle && <p className="umc-modal-s">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
