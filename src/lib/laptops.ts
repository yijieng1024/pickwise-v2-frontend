export type Vendor = "official" | "retail" | "used";

export interface VendorOffer {
  name: string;
  price: string;
  shipping: string;
  voucher: string | null;
  type: Vendor;
}

export interface Review {
  source: string;
  quote: string;
  rating: string;
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
  xai: { perf: string; battery: string; match: string };
  vendor: { name: string; type: Vendor };
  sentiment: { summary: string; reviews: Review[] };
  community?: { battery: string; cinebench: string; users: number };
  accessories?: { name: string; price: string; icon: string }[];
  vendorList?: VendorOffer[];
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
    xai: {
      perf: "+20 points",
      battery: "+25 points",
      match: "+53 points (Fits 'Creative' perfectly)",
    },
    vendor: { name: "Apple Store", type: "official" },
    sentiment: {
      summary:
        "Universally praised for unmatched efficiency and display quality, though the display notch remains divisive.",
      reviews: [
        {
          source: "The Verge",
          quote: "The battery life is practically magic, and the screen is gorgeous.",
          rating: "9/10",
        },
        {
          source: "MKBHD",
          quote: "Still the gold standard for creative professionals on the go.",
          rating: "Highly Recommended",
        },
      ],
    },
    community: { battery: "15.5 hours", cinebench: "14,200 pts", users: 124 },
    accessories: [
      { name: "Anker 7-in-1 USB-C Hub", price: "RM 249", icon: "usb" },
      { name: "Apple Magic Mouse", price: "RM 399", icon: "mouse" },
      { name: "Satechi Laptop Stand", price: "RM 189", icon: "monitor-up" },
    ],
    vendorList: [
      {
        name: "Apple Official Store",
        price: "RM 6,999",
        shipping: "Free Delivery",
        voucher: "Student Discount Valid",
        type: "official",
      },
      {
        name: "Machines (Premium Reseller)",
        price: "RM 7,050",
        shipping: "RM 15 Shipping",
        voucher: "RM 150 OFF",
        type: "retail",
      },
      {
        name: "Harvey Norman",
        price: "RM 7,499",
        shipping: "Free Delivery",
        voucher: null,
        type: "retail",
      },
      {
        name: "CompAsia (Refurbished)",
        price: "RM 5,800",
        shipping: "Free Delivery",
        voucher: null,
        type: "used",
      },
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
    xai: {
      perf: "+35 points",
      battery: "-10 points",
      match: "+60 points (Overpowered for needs)",
    },
    vendor: { name: "ROG Store", type: "official" },
    sentiment: {
      summary:
        "The ultimate compact gaming machine, blending sleek CNC aesthetics with serious horsepower.",
      reviews: [
        {
          source: "Dave2D",
          quote: "They finally fixed the screen wobble. It's the perfect 14-inch gamer.",
          rating: "Editor's Choice",
        },
        {
          source: "IGN",
          quote: "Packs a tremendous punch without looking like a spaceship.",
          rating: "8.5/10",
        },
      ],
    },
    community: { battery: "6.5 hours", cinebench: "17,100 pts", users: 89 },
    accessories: [
      { name: "ROG Gladius III Mouse", price: "RM 359", icon: "mouse" },
      { name: "WD_Black 2TB NVMe", price: "RM 799", icon: "hard-drive" },
    ],
    vendorList: [
      {
        name: "ROG Official Store",
        price: "RM 7,299",
        shipping: "Free Delivery",
        voucher: null,
        type: "official",
      },
      {
        name: "TechStore Malaysia",
        price: "RM 7,350",
        shipping: "Free Delivery",
        voucher: "RM 50 OFF",
        type: "retail",
      },
      {
        name: "Harvey Norman",
        price: "RM 7,499",
        shipping: "RM 20 Shipping",
        voucher: "Free Backpack",
        type: "retail",
      },
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
    xai: {
      perf: "+15 points",
      battery: "+10 points",
      match: "+47 points (Slightly over budget)",
    },
    vendor: { name: "Dell Store", type: "official" },
    sentiment: {
      summary:
        "Gorgeous futuristic design, but the invisible trackpad and touch-function row take getting used to.",
      reviews: [
        {
          source: "Engadget",
          quote: "Looks like it came from the future, with a screen to match.",
          rating: "88/100",
        },
        {
          source: "Linus Tech Tips",
          quote: "Form over function in some areas, but undeniably premium.",
          rating: "Good",
        },
      ],
    },
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
      "https://images.unsplash.com/photo-1593642702821-c823b2816291?auto=format&fit=crop&q=80&w=600",
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
    xai: {
      perf: "+12 points",
      battery: "+15 points",
      match: "+61 points (Perfect budget fit)",
    },
    vendor: { name: "Acer Store", type: "official" },
    sentiment: {
      summary:
        "Unbeatable value for an OLED screen, making it the perfect student or office companion.",
      reviews: [
        {
          source: "Tom's Guide",
          quote: "You simply won't find a better display at this price point.",
          rating: "4/5 Stars",
        },
        {
          source: "Laptop Mag",
          quote: "Excellent performance-per-dollar ratio.",
          rating: "Highly Recommended",
        },
      ],
    },
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
    xai: {
      perf: "+28 points",
      battery: "-15 points",
      match: "+66 points (Great for mixed use)",
    },
    vendor: { name: "Lenovo Store", type: "official" },
    sentiment: {
      summary:
        "Stellar thermal management and great performance for the price, though slightly bulky.",
      reviews: [
        {
          source: "Hardware Unboxed",
          quote: "Lenovo's cooling solution here is class-leading.",
          rating: "A Tier",
        },
        {
          source: "PC Gamer",
          quote: "A reliable workhorse that won't break the bank.",
          rating: "86/100",
        },
      ],
    },
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
    xai: {
      perf: "+10 points",
      battery: "+20 points",
      match: "+45 points (Pricy for general use)",
    },
    vendor: { name: "Lenovo Store", type: "official" },
    sentiment: {
      summary:
        "The gold standard for business laptops with an unparalleled typing experience.",
      reviews: [
        {
          source: "TechRadar",
          quote: "Still the king of the corporate world. Keyboard is unmatched.",
          rating: "4.5/5 Stars",
        },
        {
          source: "PCMag",
          quote: "Lightweight, durable, and secure.",
          rating: "Editors' Choice",
        },
      ],
    },
    community: { battery: "12.0 hours", cinebench: "9,800 pts", users: 210 },
    accessories: [
      { name: "ThinkPad Universal Dock", price: "RM 899", icon: "server" },
      { name: "Lenovo Go Wireless Mouse", price: "RM 159", icon: "mouse" },
    ],
    vendorList: [
      {
        name: "Lenovo Malaysia",
        price: "RM 8,599",
        shipping: "Free Delivery",
        voucher: "RM 200 OFF",
        type: "official",
      },
      {
        name: "Harvey Norman",
        price: "RM 8,699",
        shipping: "Free Delivery",
        voucher: null,
        type: "retail",
      },
      {
        name: "CompAsia (Refurbished)",
        price: "RM 7,200",
        shipping: "Free Delivery",
        voucher: null,
        type: "used",
      },
    ],
  },
];

export function getLaptop(id: number): Laptop | undefined {
  return laptops.find((l) => l.id === id);
}

export const featuredLaptops = [laptops[3], laptops[1], laptops[5]];
export const topPicks = laptops.slice(0, 3);
