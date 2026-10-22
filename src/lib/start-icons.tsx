import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Youtube,
  Mail,
  Users,
  Newspaper,
  Instagram,
  Facebook,
  HandHeart,
  Sunrise,
  MessageCircleHeart,
  Heart,
  Star,
  Gift,
  Calendar,
  Music,
  Mic,
  Video,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";

export const START_ICONS: Record<string, LucideIcon> = {
  ArrowRight,
  BookOpen,
  Sparkles,
  Youtube,
  Mail,
  Users,
  Newspaper,
  HandHeart,
  Sunrise,
  MessageCircleHeart,
  Heart,
  Star,
  Gift,
  Calendar,
  Music,
  Mic,
  Video,
  Link: LinkIcon,
  Instagram,
  Facebook,
};

export const ICON_OPTIONS = Object.keys(START_ICONS);

export function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.6 6.3a5.4 5.4 0 0 1-3.4-2v9.4a6.2 6.2 0 1 1-6.2-6.2c.34 0 .68.03 1 .1v2.5a3.7 3.7 0 1 0 2.7 3.6V2h2.5a5.4 5.4 0 0 0 3.4 4.3z" />
    </svg>
  );
}

export const SOCIAL_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  tiktok: TikTokIcon,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
};

export const SOCIAL_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"] as const;

export function StartIcon({ name, className }: { name: string; className?: string }) {
  const Icon = START_ICONS[name] ?? ArrowRight;
  return <Icon className={className} />;
}
