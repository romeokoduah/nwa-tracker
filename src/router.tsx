import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AdminGate } from '@/components/layout/AdminGate';
import { AuthGate } from '@/components/layout/AuthGate';

import { Overview } from '@/pages/public/Overview';
import { Countries } from '@/pages/public/Countries';
import { CountryDetail } from '@/pages/public/CountryDetail';
import { Figures } from '@/pages/public/Figures';
import { Reports } from '@/pages/public/Reports';
import { Reviews } from '@/pages/public/Reviews';
import { Team } from '@/pages/public/Team';
import { TeamMemberDetail } from '@/pages/public/TeamMemberDetail';

import { Login } from '@/pages/Login';
import { MyWork } from '@/pages/MyWork';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminAssignments } from '@/pages/admin/AdminAssignments';
import { AdminCountries } from '@/pages/admin/AdminCountries';
import { AdminTeam } from '@/pages/admin/AdminTeam';
import { AdminDeadlines } from '@/pages/admin/AdminDeadlines';
import { AdminActivity } from '@/pages/admin/AdminActivity';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminMailing } from '@/pages/admin/AdminMailing';

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="countries" element={<Countries />} />
        <Route path="countries/:id" element={<CountryDetail />} />
        <Route path="figures" element={<Figures />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="team" element={<Team />} />
        <Route path="team/:id" element={<TeamMemberDetail />} />

        <Route
          path="me"
          element={
            <AuthGate>
              <MyWork />
            </AuthGate>
          }
        />

        <Route
          path="admin"
          element={
            <AdminGate>
              <AdminDashboard />
            </AdminGate>
          }
        />
        <Route
          path="admin/assignments"
          element={
            <AdminGate>
              <AdminAssignments />
            </AdminGate>
          }
        />
        <Route
          path="admin/countries"
          element={
            <AdminGate>
              <AdminCountries />
            </AdminGate>
          }
        />
        <Route
          path="admin/team"
          element={
            <AdminGate>
              <AdminTeam />
            </AdminGate>
          }
        />
        <Route
          path="admin/deadlines"
          element={
            <AdminGate>
              <AdminDeadlines />
            </AdminGate>
          }
        />
        <Route
          path="admin/activity"
          element={
            <AdminGate>
              <AdminActivity />
            </AdminGate>
          }
        />
        <Route
          path="admin/mailing"
          element={
            <AdminGate>
              <AdminMailing />
            </AdminGate>
          }
        />
        <Route
          path="admin/settings"
          element={
            <AdminGate>
              <AdminSettings />
            </AdminGate>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
