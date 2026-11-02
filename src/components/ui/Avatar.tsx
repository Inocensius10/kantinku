import { useAvatarUrls } from '@/hooks/useAvatarUrls';
import { initials } from '@/lib/format';

const sizes = { xs: 'h-7 w-7 text-[10px]', sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

interface Props {
  name: string | null | undefined;
  path?: string | null;
  /** URL langsung (mis. hasil batch signed URL atau preview lokal) — mengalahkan `path` */
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ name, path, src, size = 'md', className = '' }: Props) {
  const urls = useAvatarUrls(src ? [] : [path]);
  const url = src ?? (path ? urls[path] : undefined);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream font-bold text-brand ring-2 ring-white ${sizes[size]} ${className}`}
    >
      {url ? <img src={url} alt={name ?? 'Foto profil'} className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </div>
  );
}
