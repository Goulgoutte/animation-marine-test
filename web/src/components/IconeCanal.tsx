import { AtSign, Camera, CircleHelp, FileText, Gamepad2, Handshake, Link2, Mail, MessageCircle, Smartphone, Ticket, type LucideIcon } from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  mail: Mail,
  mail_pro: Mail,
  mail_perso: AtSign,
  formulaire: FileText,
  linkedin: Link2,
  instagram: Camera,
  discord: Gamepad2,
  whatsapp: MessageCircle,
  sms: Smartphone,
  salon: Ticket,
  recommandation: Handshake,
  autre: CircleHelp,
};

/** Petite icône du canal de candidature (lucide n’a pas de logos de marques : pictogrammes proches). */
export function IconeCanal({ canal, className = "h-3.5 w-3.5" }: { canal: string; className?: string }) {
  const I = ICONES[canal] ?? CircleHelp;
  return <I className={`inline-block flex-none align-[-2px] ${className}`} aria-hidden />;
}
