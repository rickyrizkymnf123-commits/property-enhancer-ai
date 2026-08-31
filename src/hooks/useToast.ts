import { useToastContext } from '../contexts/ToastContext';

export function useToast() {
  const { toast, toasts, dismissToast, showToast } = useToastContext();
  return { toast, toasts, dismissToast, showToast };
}

export default useToast;
