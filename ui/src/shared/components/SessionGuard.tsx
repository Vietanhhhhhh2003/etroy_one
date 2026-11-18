import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { userApi } from '../../features/user/user.api';
import type { UserProfile } from '../../features/user/user.types';

export default function SessionGuard({
  children,
  admin = false,
  home = false,
}: {
  children?: ReactNode;
  admin?: boolean;
  home?: boolean;
}) {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const location = useLocation();
  useEffect(() => {
    userApi
      .getMe()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);
  if (profile === undefined) return <p role="status">Checking access...</p>;
  if (!profile)
    return (
      <Navigate to={admin ? '/admin/login' : '/login'} state={{ from: location }} replace />
    );
  if (admin && !profile.isAdmin)
    return (
      <div role="alert">
        <h1>Access denied</h1>
        <p>This area requires an administrator account.</p>
        <Link to="/user/profile">Go to your account</Link>
        <br />
        <Link to="/admin/login">Sign in as administrator</Link>
      </div>
    );
  if (home) return <Navigate to={profile.isAdmin ? '/admin/overview' : '/user/profile'} replace />;
  return children;
}
