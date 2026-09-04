import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import Group from '../../imports/LogoGroup';
import { NAV_ITEMS } from './navItems';
import { NavIcon } from './NavIcon';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);

  const initial = user?.businessName?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside
      className="hidden lg:flex flex-col min-h-screen py-6"
      style={{
        width: collapsed ? '72px' : '200px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {collapsed ? (
        <div className="flex flex-col items-center flex-1 py-1 gap-1">
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menú"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <div className="w-7 h-7 relative">
              <Group />
            </div>
          </button>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mt-2 mb-3"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
              {initial}
            </span>
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              title={item.label}
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-brand-tint)' : 'transparent',
                color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
              })}
            >
              <NavIcon id={item.id} />
            </NavLink>
          ))}

          <div className="flex-1 flex items-end pb-2">
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Expandir"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between px-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 relative shrink-0">
                  <Group />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: 'var(--color-brand-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  agendya
                </span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                title="Colapsar menú"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div
              className="flex items-center gap-2.5 mx-3 px-2.5 py-2.5 rounded-xl mb-5"
              style={{ backgroundColor: 'var(--color-surface-soft)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-brand-primary)' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                  {initial}
                </span>
              </div>
              <div className="overflow-hidden">
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.businessName}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-0.5 px-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left w-full"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--color-brand-tint)' : 'transparent',
                    color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', flexShrink: 0 }}>
                        <NavIcon id={item.id} />
                      </span>
                      {item.label}
                      {isActive && (
                        <span
                          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--color-brand-primary)' }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="px-3">
            <button
              onClick={logout}
              className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl w-full text-left"
              style={{
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                background: 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <path d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 13l4-4-4-4M16 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
