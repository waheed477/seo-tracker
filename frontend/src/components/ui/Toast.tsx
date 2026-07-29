import { useToastStore, ToastType } from '../../store/toastStore';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-900/80 border-emerald-700/50 text-emerald-200',
  error: 'bg-red-900/80 border-red-700/50 text-red-200',
  info: 'bg-sky-900/80 border-sky-700/50 text-sky-200',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 max-w-sm space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-slide-in flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${TYPE_STYLES[toast.type]}`}
        >
          <span className="flex-shrink-0 text-sm font-bold">{TYPE_ICONS[toast.type]}</span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 flex-shrink-0 text-xs opacity-60 transition-opacity hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
