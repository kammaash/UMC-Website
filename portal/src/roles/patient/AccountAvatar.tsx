// AccountAvatar.tsx — the small avatar in the brand row's corner: the
// patient's own photo (users/{uid}.profilePhotoUrl, the same field the app
// writes) when set, otherwise their first initial in a tinted circle — the
// app's own Account/Edit Profile screen fallback. The app's OTHER fallback,
// the drawer's animated 3D pill model, doesn't fit a button this size and
// isn't portable to the web, so it's not used here.
export function AccountAvatar({ photoUrl, name }: { photoUrl?: string; name: string }) {
  if (photoUrl) return <img className="umc-rem-avatar-img" src={photoUrl} alt="" />
  const initial = (name || '').trim().charAt(0).toUpperCase() || '?'
  return <span className="umc-rem-avatar-fallback" aria-hidden="true">{initial}</span>
}
