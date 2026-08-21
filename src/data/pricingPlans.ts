import { PricingPlan, PlanTierId } from '../types';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    tierNumber: 0,
    nameBurmese: 'အခမဲ့ စမ်းသပ်ခြင်း',
    nameEnglish: 'Free Plan',
    priceMmk: 0,
    priceDisplay: 'အခမဲ့',
    priceFormattedNumber: '0',
    billingCycle: 'တစ်ရက်လျှင် ၂ ပုဒ်',
    limitDescription: 'တစ်ရက်လျှင် ၂ ပုဒ် အခမဲ့ ပြုလုပ်ခွင့် (Daily 2 Free Recaps)',
    features: [
      'တစ်ရက်လျှင် ၂ ပုဒ် အခမဲ့ ပြုလုပ်ခွင့် (Daily 2 Free Recaps)',
      '၂၄ နာရီပြည့်တိုင်း ၂ ပုဒ် ပြန်လည် Reset ဖြစ်မည်',
      'အခြေခံ မြန်မာ AI အသံများ အသုံးပြုခွင့်',
    ],
    isPaid: false,
    recapLimit: 2,
    periodType: 'daily',
  },
  {
    id: 'vip_unlimited',
    tierNumber: 1,
    nameBurmese: 'စိတ်ကြိုက် အကန့်အသတ်မရှိ',
    nameEnglish: 'VIP Unlimited Plan',
    badge: '👑 VIP UNLIMITED (စိတ်ကြိုက်)',
    priceMmk: 10000,
    priceDisplay: '၁၀,၀၀၀ ကျပ် / တစ်လ',
    priceFormattedNumber: '၁၀,၀၀၀',
    billingCycle: 'တစ်လ',
    limitDescription: 'တစ်လလုံး ဗီဒီယို စိတ်ကြိုက် အကန့်အသတ်မရှိ ထုတ်ယူခွင့် (Unlimited Recaps)',
    features: [
      'တစ်လလုံး ဗီဒီယို စိတ်ကြိုက် အကန့်အသတ်မရှိ ထုတ်ယူခွင့် (Unlimited Recaps)',
      'မြန်မာ AI Voice Models ၄၀ စလုံး အပြည့်အစုံ',
      'Fast 1080p 60fps Ultra HD Video Render',
      'VIP Priority Fast Processing & No Watermark',
    ],
    isPaid: true,
    recapLimit: 999999,
    periodType: 'unlimited',
  },
];

export function getPlanById(id: string): PricingPlan {
  return PRICING_PLANS.find((p) => p.id === id) || PRICING_PLANS[1] || PRICING_PLANS[0];
}

