import React from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const Switch: React.FC<SwitchProps> = ({ id, checked, onChange, label }) => {
  return (
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`block w-10 h-5 rounded-full ${checked ? 'bg-sky-500' : 'bg-slate-200'}`}></div>
        <div
          className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-5' : ''}`}>
        </div>
      </div>
      <div className="ml-3 text-sm text-slate-600">
        {label}
      </div>
    </label>
  );
};

export default Switch;
