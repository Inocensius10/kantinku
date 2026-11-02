import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { authService } from '@/services/authService';
import { toMessage } from '@/lib/errors';
import { useToast } from '@/contexts/ToastContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Masukkan email yang valid.';
    if (!password) errs.password = 'Password wajib diisi.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await authService.signIn(email, password);
      // Pengalihan sesuai role ditangani oleh guard PublicOnly setelah profil dimuat.
    } catch (err) {
      setFormError(toMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    if (!EMAIL_RE.test(resetEmail.trim())) {
      toast.error('Masukkan email yang valid.');
      return;
    }
    setResetLoading(true);
    try {
      await authService.sendPasswordReset(resetEmail);
      toast.success('Link reset password telah dikirim. Cek email Anda.');
      setResetOpen(false);
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout title="Masuk" subtitle="Gunakan email dan password akun Kantinku Anda.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Email" error={errors.email}>
          <Input type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setResetOpen(true);
            }}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Lupa password?
          </button>
        </div>
        <Button type="submit" block size="lg" loading={loading} icon={<LogIn className="h-5 w-5" />}>
          Login
        </Button>
        <p className="text-center text-sm text-ink-soft">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Buat Akun Baru
          </Link>
        </p>
      </form>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset password"
        description="Kami akan mengirim link untuk membuat password baru."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button onClick={sendReset} loading={resetLoading}>
              Kirim link
            </Button>
          </>
        }
      >
        <Field label="Email">
          <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="nama@email.com" />
        </Field>
      </Modal>
    </AuthLayout>
  );
}
