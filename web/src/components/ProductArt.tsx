import clsx from 'clsx';
import {
  Archive,
  Armchair,
  Backpack,
  Briefcase,
  ChefHat,
  Coffee,
  Dumbbell,
  Flame,
  Inbox,
  Lamp,
  LampDesk,
  Laptop,
  Leaf,
  Milk,
  NotebookPen,
  Package,
  PenLine,
  ShoppingBag,
  Slice,
  Sparkles,
  Tent,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/** The API has no photos, so each product gets a drawn tile: an icon on its category's colour. */
const ICONS: [RegExp, LucideIcon][] = [
  [/mug|tea/i, Coffee],
  [/pour-over|coffee/i, Coffee],
  [/board/i, ChefHat],
  [/knife/i, Slice],
  [/jar/i, Archive],
  [/desk lamp/i, LampDesk],
  [/lantern/i, Lamp],
  [/notebook/i, NotebookPen],
  [/stand/i, Laptop],
  [/pen/i, PenLine],
  [/tray/i, Inbox],
  [/bottle/i, Milk],
  [/blanket/i, Tent],
  [/stool/i, Armchair],
  [/mat/i, Waves],
  [/candle/i, Flame],
  [/roller/i, Dumbbell],
  [/backpack/i, Backpack],
  [/duffel/i, Briefcase],
  [/pouch/i, Package],
  [/tote|sling|bag/i, ShoppingBag],
  [/chef|cook/i, UtensilsCrossed],
  [/sampler|leaf/i, Leaf],
];

const PALETTES: Record<string, [string, string]> = {
  kitchen: ['#F4DCCB', '#B4532A'],
  'home-office': ['#DDE5EF', '#2F5D8C'],
  outdoors: ['#DCEADF', '#2F6B4F'],
  wellbeing: ['#EADFF0', '#6B4A8A'],
  bags: ['#EFE5CF', '#8A6512'],
};

export function ProductArt({
  name,
  category,
  className,
  iconSize = 64,
}: {
  name: string;
  category?: string;
  className?: string;
  iconSize?: number;
}) {
  const Icon = ICONS.find(([re]) => re.test(name))?.[1] ?? Sparkles;
  const [bg, fg] = PALETTES[category ?? ''] ?? ['#ECE7DC', '#4A4943'];

  return (
    <div
      className={clsx(
        'relative grid place-items-center overflow-hidden',
        className,
      )}
      style={{ background: bg }}
      aria-hidden="true"
    >
      <div
        className="absolute -top-1/4 -right-1/4 size-3/4 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, #fff, transparent 70%)` }}
      />
      <Icon size={iconSize} strokeWidth={1.4} color={fg} />
    </div>
  );
}
