import { Routes, Route } from 'react-router-dom'
import { RequireRole } from '../shared/auth/RequireRole'
import { RoleLanding } from './RoleLanding'
import { LoginPage } from './LoginPage'
import { DoctorShell } from '../roles/doctor/DoctorShell'
import { HomePage } from '../roles/doctor/pages/HomePage'
import { SchedulePage } from '../roles/doctor/pages/SchedulePage'
import { PatientsPage } from '../roles/doctor/pages/PatientsPage'
import { NotesPage } from '../roles/doctor/pages/NotesPage'
import { FinancePage } from '../roles/doctor/pages/FinancePage'
import { SettingsPage } from '../roles/doctor/pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleLanding />} />
      <Route path="/dashboard" element={<RequireRole role="doctor" />}>
        <Route element={<DoctorShell />}>
          <Route index element={<HomePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
