"use client";

import { useState } from "react";

const NEW_VALUE = "__new__";
const AUTO_VALUE = "";

export default function ClassSelect({
  subjects,
  value,
  onChange,
  allowAuto = false,
  className = "",
}: {
  subjects: string[];
  value: string;
  onChange: (value: string) => void;
  allowAuto?: boolean;
  className?: string;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState("");

  const baseOptions = Array.from(new Set(["General", ...subjects]));
  const options = value && !baseOptions.includes(value) ? [value, ...baseOptions] : baseOptions;

  function commitNew() {
    const trimmed = newValue.trim();
    if (trimmed) onChange(trimmed);
    setAddingNew(false);
    setNewValue("");
  }

  if (addingNew) {
    return (
      <input
        autoFocus
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitNew();
          if (e.key === "Escape") {
            setAddingNew(false);
            setNewValue("");
          }
        }}
        onBlur={commitNew}
        placeholder="New class name…"
        className={className}
      />
    );
  }

  return (
    <select
      value={value || (allowAuto ? AUTO_VALUE : "General")}
      onChange={(e) => {
        if (e.target.value === NEW_VALUE) {
          setAddingNew(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      {allowAuto && <option value={AUTO_VALUE}>Class (auto from text)</option>}
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option value={NEW_VALUE}>+ Add new class…</option>
    </select>
  );
}
