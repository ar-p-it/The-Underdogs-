import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { FiHome, FiUsers } from 'react-icons/fi';

export default function Sidebar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const asideRef = useRef(null);
  const itemClass = (path) => `btn btn-ghost justify-start ${pathname === path ? 'text-emerald-600 font-semibold' : 'text-emerald-600 font-semibold'}`;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => {
      setIsDesktop(mq.matches);
      setOpen(mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isDesktop && open && asideRef.current && !asideRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [isDesktop, open]);

  const widthClass = isDesktop ? 'w-64' : open ? 'w-64' : 'w-12';

  return (
    <aside
      ref={asideRef}
      className={`relative bg-white border-r transition-[width] duration-300 ease-out ${widthClass} shrink-0`}
      onMouseEnter={() => { if (!isDesktop) setOpen(true); }}
      onMouseLeave={() => { if (!isDesktop) setOpen(false); }}
      onTouchStart={() => { if (!isDesktop) setOpen(true); }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`font-bold text-xl text-emerald-700 ${open || isDesktop ? 'inline' : 'hidden md:inline'}`}>Menu</span>
          <span className={`text-emerald-700 ${open || isDesktop ? 'hidden' : 'inline md:hidden'}`}>⋮</span>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/dashboard" className={itemClass('/dashboard')} aria-label="Dashboard">
            <FiHome className="text-emerald-600 mr-2" />
            <span className={`${open || isDesktop ? 'inline' : 'hidden md:inline'}`}>Dashboard</span>
          </Link>
          <Link to="/my-groups" className={itemClass('/my-groups')} aria-label="My Groups">
            <FiUsers className="text-emerald-600 mr-2" />
            <span className={`${open || isDesktop ? 'inline' : 'hidden md:inline'}`}>My Groups</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
