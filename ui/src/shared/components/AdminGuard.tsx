import type { ReactNode } from 'react';
import SessionGuard from './SessionGuard';
export default function AdminGuard({ children }: { children: ReactNode }) {
  return <SessionGuard admin>{children}</SessionGuard>;
}
