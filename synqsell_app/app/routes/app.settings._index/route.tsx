import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/app/settings') {
      navigate('/app/settings/user');
    }
  }, [location, navigate]);

  return <Outlet />;
}
