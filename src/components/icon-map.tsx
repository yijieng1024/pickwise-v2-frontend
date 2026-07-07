import {
  BatteryCharging,
  Briefcase,
  Cpu,
  Gamepad2,
  HardDrive,
  Keyboard,
  Layout,
  MonitorPlay,
  MonitorUp,
  Mouse,
  Server,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
  Usb,
  Wallet,
  Weight,
  type LucideIcon,
} from "lucide-react";

/** Maps the kebab-case icon names stored in laptop data to Lucide components. */
const iconMap: Record<string, LucideIcon> = {
  "battery-charging": BatteryCharging,
  "monitor-play": MonitorPlay,
  cpu: Cpu,
  weight: Weight,
  layout: Layout,
  sparkles: Sparkles,
  wallet: Wallet,
  briefcase: Briefcase,
  "gamepad-2": Gamepad2,
  "thermometer-snowflake": ThermometerSnowflake,
  keyboard: Keyboard,
  "shield-check": ShieldCheck,
  usb: Usb,
  mouse: Mouse,
  "monitor-up": MonitorUp,
  "hard-drive": HardDrive,
  server: Server,
};

export function DataIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = iconMap[name] ?? Sparkles;
  return <Icon className={className} />;
}
