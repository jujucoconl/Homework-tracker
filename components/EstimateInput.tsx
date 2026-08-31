"use client";

export default function EstimateInput({
  value,
  onChange,
  className = "",
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={5}
      step={5}
      inputMode="numeric"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : Math.max(5, parseInt(raw, 10) || 0));
      }}
      placeholder="min"
      title="Estimated time (minutes, optional)"
      className={className}
    />
  );
}
