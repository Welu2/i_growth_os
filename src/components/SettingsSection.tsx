import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function SettingsSection({ title, description, icon: Icon, children }: { title: string; description: string; icon: LucideIcon; children: ReactNode }) {
  return <details className="settings-section"><summary><span className="settings-icon"><Icon size={21} /></span><span className="grow"><strong>{title}</strong><span className="small">{description}</span></span><ChevronDown size={19} className="disclosure-chevron" /></summary><div className="settings-content stack">{children}</div></details>;
}
