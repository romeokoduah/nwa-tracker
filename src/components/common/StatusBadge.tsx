import {
  CheckCircle2,
  Clock,
  Eye,
  Circle,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TaskStatus, ReportStatus } from '@/lib/types';
import { STATUS_LABELS, REPORT_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  overdue?: boolean;
}

export function TaskStatusBadge({ status, className, overdue }: TaskStatusBadgeProps) {
  if (overdue && status !== 'done') {
    return (
      <Badge variant="danger" className={cn('gap-1', className)}>
        <AlertCircle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }
  const map: Record<TaskStatus, { variant: 'success' | 'info' | 'teal' | 'muted' | 'danger'; icon: typeof CheckCircle2 }> = {
    done: { variant: 'success', icon: CheckCircle2 },
    in_progress: { variant: 'info', icon: Clock },
    in_review: { variant: 'teal', icon: Eye },
    not_started: { variant: 'muted', icon: Circle },
    blocked: { variant: 'danger', icon: Ban },
  };
  const { variant, icon: Icon } = map[status];
  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface ReportStatusBadgeProps {
  status: ReportStatus;
  className?: string;
  overdue?: boolean;
}

export function ReportStatusBadge({ status, className, overdue }: ReportStatusBadgeProps) {
  if (overdue && status !== 'met') {
    return (
      <Badge variant="danger" className={cn('gap-1', className)}>
        <AlertCircle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }
  const map: Record<ReportStatus, { variant: 'success' | 'info' | 'teal' | 'muted' | 'danger'; icon: typeof CheckCircle2 }> = {
    met: { variant: 'success', icon: CheckCircle2 },
    in_progress: { variant: 'info', icon: Clock },
    in_review: { variant: 'teal', icon: Eye },
    not_started: { variant: 'muted', icon: Circle },
    not_met: { variant: 'danger', icon: Ban },
  };
  const { variant, icon: Icon } = map[status];
  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}
