import { supabase } from '@/lib/supabase';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  address: string;
  birth_date: string;
  outlet_id: string;
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data;
  },

  /** Role & status TIDAK dikirim — ditentukan database (employee / pending). */
  async signUp(p: RegisterPayload) {
    const { data, error } = await supabase.auth.signUp({
      email: p.email.trim(),
      password: p.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: p.full_name.trim(),
          phone: p.phone.trim(),
          address: p.address.trim(),
          birth_date: p.birth_date,
          outlet_id: p.outlet_id,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/login` },
    );
    if (error) throw error;
  },

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },
};
