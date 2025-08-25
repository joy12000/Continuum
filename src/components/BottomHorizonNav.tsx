
import React from "react";
import { NavLink } from "react-router-dom";
const tabs = [
  { to: "/",        label: "홈",     icon: "🏠" },
  { to: "/calendar",label: "달력",   icon: "📅" },
  { to: "/search",  label: "검색",   icon: "🔎" },
  { to: "/recall",   label: "리콜",   icon: "🪢" },
];
const BottomHorizonNav: React.FC = () => {
  return (
    <>
      <nav className="horizon-nav">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} className={({isActive}) => `horizon-item ${isActive ? "active": ""}`}>
            <span className="icon" aria-hidden="true">{t.icon}</span>
            <span className="label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <aside className="left-rail">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} className={({isActive}) => `rail-item ${isActive ? "active": ""}`}>
            <span aria-hidden="true" style={{fontSize: 20}}>{t.icon}</span>
            <span className="sr-only">{t.label}</span>
          </NavLink>
        ))}
      </aside>
    </>
  );
};
export default BottomHorizonNav;
