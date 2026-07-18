// Pricing Configuration (All base prices in AED)
const PRICING_CONFIG = {
  'Business Cards': {
    baseAED: 120, // Example placeholder
    tiers: [
      { min: 0, max: 249, pricePerUnit: 0.60 },
      { min: 250, max: 499, pricePerUnit: 0.45 },
      { min: 500, max: 999, pricePerUnit: 0.35 },
      { min: 1000, max: 99999, pricePerUnit: 0.25 },
    ]
  },
  'Letterhead': { baseAED: 150, tiers: [{min:0, max:99999, pricePerUnit: 0.5}] },
  'Envelopes': { baseAED: 100, tiers: [{min:0, max:99999, pricePerUnit: 0.4}] },
  'Presentation Folders': { baseAED: 300, tiers: [{min:0, max:99999, pricePerUnit: 2.0}] },
  'Flyers': { baseAED: 80, tiers: [{min:0, max:99999, pricePerUnit: 0.3}] },
  'Posters': { baseAED: 200, tiers: [{min:0, max:99999, pricePerUnit: 1.5}] },
  'Brochures': { baseAED: 250, tiers: [{min:0, max:99999, pricePerUnit: 0.8}] },
  'Booklets': { baseAED: 500, tiers: [{min:0, max:99999, pricePerUnit: 3.0}] },
  'NCR Forms': { baseAED: 350, tiers: [{min:0, max:99999, pricePerUnit: 0.7}] },
  'Notepads': { baseAED: 180, tiers: [{min:0, max:99999, pricePerUnit: 1.2}] },
  'Promotional Pads': { baseAED: 160, tiers: [{min:0, max:99999, pricePerUnit: 1.0}] },
  'Paper Bags': { baseAED: 400, tiers: [{min:0, max:99999, pricePerUnit: 2.5}] },
};

const FINISHING_MODIFIERS = {
  'Spot UV': 0.25, // +25%
  'Lamination Gloss': 0.15,
  'Lamination Matt': 0.15,
  'Embossing': 0.35,
  'Foil Stamping': 0.40,
  'None': 0.00,
};

/**
 * Calculate the estimated price in AED
 */
function calculateBasePrice(service, quantity, finishing) {
  const config = PRICING_CONFIG[service];
  if (!config) return 0; // Unknown service

  let basePrice = config.baseAED || 0;
  let unitPrice = 0;

  // Find correct tier
  if (config.tiers && config.tiers.length > 0) {
    const tier = config.tiers.find(t => quantity >= t.min && quantity <= t.max);
    if (tier) {
      unitPrice = tier.pricePerUnit;
    } else {
      // fallback to highest tier
      unitPrice = config.tiers[config.tiers.length - 1].pricePerUnit;
    }
  }

  let totalAED = basePrice + (quantity * unitPrice);

  // Apply finishing modifier
  if (finishing && FINISHING_MODIFIERS[finishing]) {
    totalAED += (totalAED * FINISHING_MODIFIERS[finishing]);
  }

  return parseFloat(totalAED.toFixed(2));
}

module.exports = {
  PRICING_CONFIG,
  calculateBasePrice
};
