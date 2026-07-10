export interface XaiFactor {
  name: string;
  /** Point contribution toward the PickScore; positive or negative. */
  value: number;
}

export interface ReviewPoint {
  /** Paraphrased reviewer point — never a verbatim quote. */
  point: string;
  channel: string;
  timestampLabel: string;
  /** true = strength ("what reviewers love"), false = weakness ("watch out for"). */
  strength: boolean;
}

export interface Benchmark {
  label: string;
  sub: string;
  /** 0–100, relative to the best laptop in the same budget band. */
  pct: number;
}

export interface Laptop {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: string;
  priceValue: number;
  score: number;
  image: string;
  badge: string;
  badgeClass: string;
  specs: { cpu: string; ram: string; display?: string; gpu?: string };
  /** Short feature/category chips shown on cards and the details page */
  tags: string[];
  plainEnglish: { icon: string; text: string }[];
  /** Performance, Portability, Battery, Display, Build Quality, Thermals (0–100) */
  radar: [number, number, number, number, number, number];
  /** 8-factor PickScore breakdown shown in the XAI popover */
  xaiFactors: XaiFactor[];
  match: string;
  sentiment: { summary: string; reviews: ReviewPoint[] };
  community?: { battery: string; cinebench: string; users: number };
  accessories?: { name: string; price: string; icon: string }[];
  benchmarks?: Benchmark[];
}

export const RADAR_AXES = [
  "Performance",
  "Portability",
  "Battery",
  "Display",
  "Build Quality",
  "Thermals",
] as const;

export const laptops: Laptop[] = [
  {
    id: 1,
    slug: "macbook-pro-14",
    name: "MacBook Pro 14-inch",
    brand: "Apple",
    price: "RM 6,999",
    priceValue: 6999,
    score: 98,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
    badge: "Best Overall Match",
    badgeClass: "bg-primary/10 text-primary",
    specs: {
      cpu: "Apple M3 Pro",
      ram: "18GB Unified",
      display: '14.2" Liquid Retina XDR',
    },
    tags: ["Creator", "Ultraportable", "Long Battery", "Mini-LED"],
    plainEnglish: [
      {
        icon: "battery-charging",
        text: "Incredible battery life; leave the charger at home.",
      },
      {
        icon: "monitor-play",
        text: "Stunning display, perfect for color-accurate design work.",
      },
    ],
    radar: [80, 85, 95, 95, 95, 80],
    xaiFactors: [
      { name: "Price", value: -8 },
      { name: "CPU", value: 24 },
      { name: "GPU", value: 9 },
      { name: "RAM / Storage", value: 6 },
      { name: "Portability", value: 16 },
      { name: "Battery", value: 23 },
      { name: "Screen", value: 19 },
      { name: "Brand", value: 6 },
    ],
    match: "Perfect Match",
    sentiment: {
      summary:
        "Universally praised for unmatched efficiency and display quality, though the display notch remains divisive.",
      reviews: [
        {
          point: "Battery comfortably lasts a full day of creative work",
          channel: "The Verge",
          timestampLabel: "6:14",
          strength: true,
        },
        {
          point: "Still the benchmark for creative professionals who work on the move",
          channel: "MKBHD",
          timestampLabel: "3:02",
          strength: true,
        },
        {
          point: "The display notch interrupts full-screen video and menu bars",
          channel: "Dave2D",
          timestampLabel: "9:40",
          strength: false,
        },
      ],
    },
    community: { battery: "15.5 hours", cinebench: "14,200 pts", users: 124 },
    accessories: [
      { name: "Anker 7-in-1 USB-C Hub", price: "RM 249", icon: "usb" },
      { name: "Apple Magic Mouse", price: "RM 399", icon: "mouse" },
      { name: "Satechi Laptop Stand", price: "RM 189", icon: "monitor-up" },
    ],
    benchmarks: [
      { label: "Video export", sub: "4K ProRes timeline", pct: 97 },
      { label: "Photo editing", sub: "Lightroom batch export", pct: 95 },
      { label: "Multitasking", sub: "40 tabs + creative suite", pct: 90 },
      { label: "Gaming", sub: "1080p medium", pct: 52 },
    ],
  },
  {
    id: 2,
    slug: "rog-zephyrus-g14",
    name: "ROG Zephyrus G14",
    brand: "Asus",
    price: "RM 7,299",
    priceValue: 7299,
    score: 85,
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=600",
    badge: "Performance King",
    badgeClass: "bg-purple-100 text-purple-800",
    specs: { cpu: "Ryzen 9 8945HS", ram: "16GB DDR5", gpu: "RTX 4060" },
    tags: ["Gaming", "RTX 4060", "OLED", "Compact Power"],
    plainEnglish: [
      {
        icon: "cpu",
        text: "Massive graphical power for 3D rendering and gaming.",
      },
      {
        icon: "weight",
        text: "Surprisingly light for a high-performance machine.",
      },
    ],
    radar: [95, 90, 60, 80, 85, 70],
    xaiFactors: [
      { name: "Price", value: -6 },
      { name: "CPU", value: 20 },
      { name: "GPU", value: 32 },
      { name: "RAM / Storage", value: 10 },
      { name: "Portability", value: 12 },
      { name: "Battery", value: -14 },
      { name: "Screen", value: 11 },
      { name: "Brand", value: 0 },
    ],
    match: "Good Match",
    sentiment: {
      summary:
        "The ultimate compact gaming machine, blending sleek CNC aesthetics with serious horsepower.",
      reviews: [
        {
          point: "Lenovo-style screen wobble is finally fixed on this generation",
          channel: "Dave2D",
          timestampLabel: "5:20",
          strength: true,
        },
        {
          point: "Serious horsepower without looking like a gaming spaceship",
          channel: "IGN",
          timestampLabel: "2:48",
          strength: true,
        },
        {
          point: "Fan noise climbs quickly under sustained load",
          channel: "Hardware Canucks",
          timestampLabel: "8:12",
          strength: false,
        },
      ],
    },
    community: { battery: "6.5 hours", cinebench: "17,100 pts", users: 89 },
    accessories: [
      { name: "ROG Gladius III Mouse", price: "RM 359", icon: "mouse" },
      { name: "WD_Black 2TB NVMe", price: "RM 799", icon: "hard-drive" },
    ],
    benchmarks: [
      { label: "Gaming", sub: "1440p high, RTX 4060", pct: 93 },
      { label: "Code compile", sub: "Chromium build", pct: 88 },
      { label: "Multitasking", sub: "40 tabs + IDE", pct: 86 },
      { label: "Photo editing", sub: "Lightroom export", pct: 79 },
    ],
  },
  {
    id: 3,
    slug: "dell-xps-14",
    name: "XPS 14",
    brand: "Dell",
    price: "RM 8,199",
    priceValue: 8199,
    score: 72,
    image:
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=600",
    badge: "Premium Windows",
    badgeClass: "bg-secondary text-secondary-foreground",
    specs: { cpu: "Core Ultra 7", ram: "16GB LPDDR5x", display: '14.5" OLED' },
    tags: ["Premium", "OLED", "AI Ready", "Minimalist"],
    plainEnglish: [
      { icon: "layout", text: "Ultra-modern, minimalist design." },
      {
        icon: "sparkles",
        text: "Built-in AI processing for smart background blurring.",
      },
    ],
    radar: [75, 80, 70, 90, 90, 75],
    xaiFactors: [
      { name: "Price", value: -18 },
      { name: "CPU", value: 14 },
      { name: "GPU", value: 4 },
      { name: "RAM / Storage", value: 9 },
      { name: "Portability", value: 10 },
      { name: "Battery", value: 11 },
      { name: "Screen", value: 15 },
      { name: "Brand", value: 2 },
    ],
    match: "Good Match",
    sentiment: {
      summary:
        "Gorgeous futuristic design, but the invisible trackpad and touch-function row take getting used to.",
      reviews: [
        {
          point: "Futuristic design with a screen that matches the styling",
          channel: "Engadget",
          timestampLabel: "4:05",
          strength: true,
        },
        {
          point: "Zero-lattice keyboard feels premium once you adjust to it",
          channel: "Linus Tech Tips",
          timestampLabel: "6:33",
          strength: true,
        },
        {
          point: "The invisible haptic trackpad takes real getting used to",
          channel: "Linus Tech Tips",
          timestampLabel: "10:15",
          strength: false,
        },
        {
          point: "Touch-function row is easy to mis-tap without looking",
          channel: "Engadget",
          timestampLabel: "7:50",
          strength: false,
        },
      ],
    },
    benchmarks: [
      { label: "Multitasking", sub: "40 tabs + office suite", pct: 84 },
      { label: "Photo editing", sub: "Lightroom export", pct: 78 },
      { label: "Code compile", sub: "Chromium build", pct: 75 },
      { label: "Gaming", sub: "1080p medium", pct: 46 },
    ],
  },
  {
    id: 4,
    slug: "acer-swift-go-14",
    name: "Acer Swift Go 14",
    brand: "Acer",
    price: "RM 3,299",
    priceValue: 3299,
    score: 88,
    image:
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=600",
    badge: "Value Pick",
    badgeClass: "bg-green-100 text-green-800",
    specs: {
      cpu: "Intel Core Ultra 5",
      ram: "16GB LPDDR5",
      display: '14" 2.8K OLED',
    },
    tags: ["Student", "Budget Pick", "OLED", "Lightweight"],
    plainEnglish: [
      {
        icon: "wallet",
        text: "Incredible value for a stunning OLED screen.",
      },
      {
        icon: "briefcase",
        text: "Light enough to carry around campus all day.",
      },
    ],
    radar: [60, 85, 75, 90, 80, 65],
    xaiFactors: [
      { name: "Price", value: 26 },
      { name: "CPU", value: 10 },
      { name: "GPU", value: 3 },
      { name: "RAM / Storage", value: 8 },
      { name: "Portability", value: 14 },
      { name: "Battery", value: 16 },
      { name: "Screen", value: 13 },
      { name: "Brand", value: -3 },
    ],
    match: "Perfect Match",
    sentiment: {
      summary:
        "Unbeatable value for an OLED screen, making it the perfect student or office companion.",
      reviews: [
        {
          point: "Unmatched OLED screen quality for the price bracket",
          channel: "Tom's Guide",
          timestampLabel: "3:18",
          strength: true,
        },
        {
          point: "Excellent performance-per-ringgit for students and office work",
          channel: "Laptop Mag",
          timestampLabel: "5:02",
          strength: true,
        },
        {
          point: "Speakers are thin and best paired with headphones",
          channel: "Tom's Guide",
          timestampLabel: "8:44",
          strength: false,
        },
      ],
    },
    benchmarks: [
      { label: "Multitasking", sub: "30 tabs + office suite", pct: 81 },
      { label: "Code compile", sub: "Chromium build", pct: 74 },
      { label: "Photo editing", sub: "Lightroom export", pct: 68 },
      { label: "Gaming", sub: "1080p low", pct: 38 },
    ],
  },
  {
    id: 5,
    slug: "legion-slim-5",
    name: "Legion Slim 5",
    brand: "Lenovo",
    price: "RM 5,499",
    priceValue: 5499,
    score: 79,
    image:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600",
    badge: "Mid-Range Gaming",
    badgeClass: "bg-red-100 text-red-800",
    specs: { cpu: "Ryzen 7 7840HS", ram: "16GB DDR5", gpu: "RTX 4060" },
    tags: ["Gaming", "RTX 4060", "1440p Ready", "Great Cooling"],
    plainEnglish: [
      {
        icon: "gamepad-2",
        text: "Plays modern games easily at 1440p resolution.",
      },
      {
        icon: "thermometer-snowflake",
        text: "Excellent cooling prevents overheating.",
      },
    ],
    radar: [85, 60, 65, 80, 85, 90],
    xaiFactors: [
      { name: "Price", value: 12 },
      { name: "CPU", value: 22 },
      { name: "GPU", value: 24 },
      { name: "RAM / Storage", value: 7 },
      { name: "Portability", value: -8 },
      { name: "Battery", value: -16 },
      { name: "Screen", value: 6 },
      { name: "Brand", value: 1 },
    ],
    match: "Good Match",
    sentiment: {
      summary:
        "Stellar thermal management and great performance for the price, though slightly bulky.",
      reviews: [
        {
          point: "Cooling stays composed even after long gaming sessions",
          channel: "Hardware Unboxed",
          timestampLabel: "6:50",
          strength: true,
        },
        {
          point: "Reliable 1440p performance without breaking the budget",
          channel: "PC Gamer",
          timestampLabel: "4:22",
          strength: true,
        },
        {
          point: "Battery drains fast once the discrete GPU kicks in",
          channel: "Hardware Unboxed",
          timestampLabel: "11:05",
          strength: false,
        },
      ],
    },
    benchmarks: [
      { label: "Gaming", sub: "1440p medium, RTX 4060", pct: 90 },
      { label: "Code compile", sub: "Chromium build", pct: 85 },
      { label: "Multitasking", sub: "40 tabs + IDE", pct: 83 },
      { label: "Photo editing", sub: "Lightroom export", pct: 74 },
    ],
  },
  {
    id: 6,
    slug: "thinkpad-x1-carbon",
    name: "ThinkPad X1 Carbon",
    brand: "Lenovo",
    price: "RM 8,599",
    priceValue: 8599,
    score: 75,
    image:
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=600",
    badge: "Business Pro",
    badgeClass: "bg-foreground text-background",
    specs: { cpu: "Core i7-1355U", ram: "32GB LPDDR5", display: '14" WUXGA' },
    tags: ["Business", "Durable", "Best Keyboard", "Secure"],
    plainEnglish: [
      {
        icon: "keyboard",
        text: "The best, most comfortable keyboard on any laptop.",
      },
      {
        icon: "shield-check",
        text: "Military-grade durability and high-end security.",
      },
    ],
    radar: [65, 95, 80, 70, 95, 75],
    xaiFactors: [
      { name: "Price", value: -22 },
      { name: "CPU", value: 8 },
      { name: "GPU", value: 2 },
      { name: "RAM / Storage", value: 10 },
      { name: "Portability", value: 20 },
      { name: "Battery", value: 21 },
      { name: "Screen", value: 6 },
      { name: "Brand", value: 8 },
    ],
    match: "Good Match",
    sentiment: {
      summary:
        "The gold standard for business laptops with an unparalleled typing experience.",
      reviews: [
        {
          point: "Typing experience is still unmatched among ultrabooks",
          channel: "TechRadar",
          timestampLabel: "2:30",
          strength: true,
        },
        {
          point: "Lightweight yet durable enough for daily business travel",
          channel: "PCMag",
          timestampLabel: "5:45",
          strength: true,
        },
        {
          point: "Integrated graphics struggle with anything beyond light editing",
          channel: "TechRadar",
          timestampLabel: "9:12",
          strength: false,
        },
      ],
    },
    community: { battery: "12.0 hours", cinebench: "9,800 pts", users: 210 },
    accessories: [
      { name: "ThinkPad Universal Dock", price: "RM 899", icon: "server" },
      { name: "Lenovo Go Wireless Mouse", price: "RM 159", icon: "mouse" },
    ],
    benchmarks: [
      { label: "Multitasking", sub: "40 tabs + office suite", pct: 80 },
      { label: "Code compile", sub: "Chromium build", pct: 70 },
      { label: "Photo editing", sub: "Lightroom export", pct: 58 },
      { label: "Gaming", sub: "1080p low", pct: 35 },
    ],
  },
];

export function getLaptop(id: number): Laptop | undefined {
  return laptops.find((l) => l.id === id);
}

export const featuredLaptops = [laptops[3], laptops[1], laptops[5]];
export const topPicks = laptops.slice(0, 3);
