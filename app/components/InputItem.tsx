// src/components/InputItem.tsx
"use client";

interface InputItemProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export default function InputItem({ icon, placeholder, value, onChange, type = "text" }: InputItemProps) {
  return (
    <div className="relative group input-group-neo">
      <div className="icon-neo">
        {icon}
      </div>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="input-neo" 
        placeholder={placeholder} 
      />
    </div>
  );
}