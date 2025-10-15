"use client";

import { useState, useEffect, Dispatch, SetStateAction, ReactNode } from "react";
import Link from "next/link";
import { useAuth, AuthUser } from "@/lib/AuthContext"; // Assuming AuthUser is exported from your context
import { usePathname } from 'next/navigation';

// --- TypeScript Interfaces for Component Props ---

// We define a simple User type here. For a real app, this would be imported from your AuthContext.
// If you haven't defined it there, you can add this to your AuthContext file:
// export interface AuthUser { name?: string; email?: string; }
// Then import it as shown above.

interface ProfileDropdownProps {
  user: AuthUser | null;
  logout: () => void;
  getInitial: (name?: string) => string;
  isMobile: boolean;
}

interface HamburgerButtonProps {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
}

interface MobileMenuProps {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  user: AuthUser | null;
  logout: () => void;
  getInitial: (name?: string) => string;
}

// --- Main Header Component ---

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isLoggedIn, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : "");

  if (!isLoggedIn || pathname === '/login') {
    return null;
  }

  return (
    <>
      <header style={{ backgroundColor: '#fff', color: '#1f2937', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', position: 'sticky', top: 0, zIndex: 30 }}>
        <nav style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb', textDecoration: 'none' }}>
            UPSCALE CRM
          </Link>
          <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '2rem' }}>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/products">Products</NavLink>
            <NavLink href="/clients">Clients</NavLink>
            <NavLink href="/quotations">Quotations</NavLink>
            <NavLink href="/invoices">Invoices</NavLink>
            <NavLink href="/amcs">AMC</NavLink>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ProfileDropdown user={user} logout={logout} getInitial={getInitial} isMobile={isMobile} />
            <HamburgerButton menuOpen={menuOpen} setMenuOpen={setMenuOpen} isMobile={isMobile} />
          </div>
        </nav>
      </header>
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} user={user} logout={logout} getInitial={getInitial} />
    </>
  );
}

// --- Typed Helper Components ---

const NavLink = ({ href, children }: { href: string; children: ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} style={{ color: isActive ? '#2563eb' : '#4b5563', fontWeight: '500', transition: 'color 0.2s', position: 'relative', textDecoration: 'none' }}>
      {children}
      {isActive && <span style={{ position: 'absolute', bottom: '-0.25rem', left: '50%', transform: 'translateX(-50%)', width: '66.66%', height: '2px', backgroundColor: '#2563eb', borderRadius: '9999px' }}></span>}
    </Link>
  );
};

const ProfileDropdown = ({ user, logout, getInitial, isMobile }: ProfileDropdownProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    if (isMobile) return null;
    return (
        <div style={{ position: "relative" }} onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.125rem', cursor: 'pointer' }}>
                {getInitial(user?.name)}
            </div>
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '16rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', opacity: dropdownOpen ? 1 : 0, visibility: dropdownOpen ? 'visible' : 'hidden', transition: 'all 300ms ease-in-out', zIndex: 50, padding: '0.5rem' }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                    <button onClick={() => alert("Settings clicked!")} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '0.375rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                        <SettingsIcon />
                        <span>Settings</span>
                    </button>
                    <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '0.375rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                        <LogoutIcon />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const HamburgerButton = ({ menuOpen, setMenuOpen, isMobile }: HamburgerButtonProps) => {
    if (!isMobile) return null;
    return (
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ zIndex: 50, width: '32px', height: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: '#1f2937', transition: 'transform 300ms', transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: '#1f2937', transition: 'opacity 300ms', opacity: menuOpen ? 0 : 1 }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: '#1f2937', transition: 'transform 300ms', transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }}></span>
        </button>
    );
};

const MobileMenu = ({ menuOpen, setMenuOpen, user, logout, getInitial }: MobileMenuProps) => {
    return (
        <>
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 40, transition: 'opacity 300ms', opacity: menuOpen ? 1 : 0, visibility: menuOpen ? 'visible' : 'hidden' }} onClick={() => setMenuOpen(false)}></div>
            <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '80%', maxWidth: '320px', backgroundColor: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', zIndex: 50, transition: 'transform 300ms ease-in-out', transform: menuOpen ? 'translateX(0)' : 'translateX(100%)' }}>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.25rem', flexShrink: 0 }}>
                            {getInitial(user?.name)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontWeight: '700', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                        </div>
                    </div>
                    <div style={{ flexGrow: 1, paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <NavLinkMobile href="/">Dashboard</NavLinkMobile>
                        <NavLinkMobile href="/products">Products</NavLinkMobile>
                        <NavLinkMobile href="/clients">Clients</NavLinkMobile>
                        <NavLinkMobile href="/quotations">Quotations</NavLinkMobile>
                        <NavLinkMobile href="/invoices">Invoices</NavLinkMobile>
                        <NavLinkMobile href="/amcs">AMC</NavLinkMobile>
                    </div>
                    <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={() => { alert("Settings clicked!"); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                            <SettingsIcon />
                            <span>Settings</span>
                        </button>
                        <button onClick={() => { logout(); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                            <LogoutIcon />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

const NavLinkMobile = ({ href, children }: { href: string; children: ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    const activeStyle = { backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '600' };
    const baseStyle = { color: '#374151' };
    return (
        <Link href={href} style={{ fontSize: '1.125rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', ...(isActive ? activeStyle : baseStyle) }}>
            {children}
        </Link>
    );
};

// --- SVG Icon Components (unchanged) ---
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" style={{height: '20px', width: '20px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" style={{height: '20px', width: '20px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;