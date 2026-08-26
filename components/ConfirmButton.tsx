"use client";

import { useEffect, useRef, useState } from "react";

export default function ConfirmButton({
  onConfirm,
  className,
  confirmClassName,
  children,
}: {
  onConfirm: () => void;
  className?: string;
  confirmClassName?: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (confirming) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setConfirming(false);
      onConfirm();
      return;
    }
    setConfirming(true);
    timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
  }

  return (
    <button onClick={handleClick} className={confirming ? confirmClassName : className}>
      {confirming ? "Confirm?" : children}
    </button>
  );
}
