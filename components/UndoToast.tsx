"use client";

export default function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-panel px-4 py-2.5 shadow-lg">
      <span className="text-sm">{message}</span>
      <button onClick={onUndo} className="text-sm font-medium text-accent hover:underline">
        Undo
      </button>
    </div>
  );
}
