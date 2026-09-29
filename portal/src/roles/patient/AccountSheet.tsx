// AccountSheet.tsx — the claimed screen's "Account details" sheet: name,
// phone, doctor, and where "Not you? Sign out" now lives (moved off the
// dashboard itself, decision 2026-09-19).
import { Icon } from '../../shared/design/icons'
import { useStrings } from './i18n/useStrings'
import { LangSwitch } from './LangSwitch'

export function AccountSheet({
  fullName, phone, doctorName, signingOut, signOutError, onSignOut, onClose,
}: {
  fullName: string
  phone: string
  doctorName?: string
  signingOut: boolean
  signOutError: string | null
  onSignOut: () => void
  onClose: () => void
}) {
  const t = useStrings()
  return (
    <div className="umc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="umc-modal" role="dialog" aria-modal="true" aria-labelledby="umc-account-t">
        <h2 id="umc-account-t" className="umc-modal-t">{t.account.title}</h2>
        <div className="umc-row"><span className="umc-row-lab">{t.account.name}</span><span className="umc-row-val">{fullName || '—'}</span></div>
        <hr className="umc-divider" />
        <div className="umc-row"><span className="umc-row-lab">{t.account.phone}</span><span className="umc-row-val">{phone}</span></div>
        <hr className="umc-divider" />
        <div className="umc-row"><span className="umc-row-lab">{t.account.doctor}</span><span className="umc-row-val">{doctorName ? t.account.dr(doctorName) : '—'}</span></div>
        <hr className="umc-divider" />
        {/* The header's corner is taken on this screen (status light,
            avatar), so the language switch lives here (decision 2026-09-29). */}
        <div className="umc-row"><span className="umc-row-lab">{t.language}</span><LangSwitch inSheet /></div>

        {signOutError && <p className="umc-rem-error" role="alert" style={{ marginTop: 16 }}><Icon name="warning" size={18} />{signOutError}</p>}

        <button type="button" className="umc-btn ghost full" disabled={signingOut} onClick={onSignOut} style={{ marginTop: 20 }}>
          {signingOut
            ? <><span className="umc-spin" aria-hidden="true" />{t.account.turningOff}</>
            : <><Icon name="logout" size={18} />{t.account.signOut}</>}
        </button>
        <button type="button" className="umc-btn ghost full" onClick={onClose} style={{ marginTop: 10 }}>{t.account.close}</button>
      </div>
    </div>
  )
}
