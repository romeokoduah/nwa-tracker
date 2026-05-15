import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface AdminGateProps {
  children: React.ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }
  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning dark:bg-warning/10">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">Admin mode — local-only authentication</div>
          <div className="mt-0.5 text-warning/80">
            v1 uses a hardcoded credential stored in localStorage. Replace with proper auth
            before production deployment.
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
