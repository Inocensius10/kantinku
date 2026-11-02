import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Field, PasswordInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert, LoadingBlock } from '@/components/ui/Feedback';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { authService } from '@/services/authService';
import { toMessage } from '@/lib/errors';

/** Tujuan link reset password dari email. Supabase membuat sesi sementara dari URL. */
export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password minimal 8 karakter.');
    if (password !== confirm) return setError('Konfirmasi password tidak sama.');
    setError(null);
    setSaving(true);
    try {
      await authService.updatePassword(password);
      toast.success('Password berhasil diubah.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="Buat password baru">
      {loading ? (
        <LoadingBlock />
      ) : !session ? (
        <Alert tone="danger" title="Link tidak valid atau kedaluwarsa">
          Minta link reset password baru dari halaman login.
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Password baru">
            <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Konfirmasi password baru">
            <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" block loading={saving} icon={<KeyRound className="h-4 w-4" />}>
            Simpan password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
