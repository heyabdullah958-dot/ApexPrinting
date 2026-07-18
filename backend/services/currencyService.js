const axios = require('axios');
const { supabaseAdmin } = require('./supabase');

const CACHE_DURATION_HOURS = 6;
const BASE_CURRENCY = process.env.EXCHANGE_BASE_CURRENCY || 'AED';
const API_KEY = process.env.EXCHANGE_API_KEY;

async function fetchLiveRates() {
  if (!API_KEY) {
    console.warn('⚠️ No EXCHANGE_API_KEY provided, falling back to default rates.');
    return { AED: 1.0, SAR: 1.02, PKR: 76.5 }; // Fallback approximations
  }

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${BASE_CURRENCY}`);
    if (response.data && response.data.conversion_rates) {
      return response.data.conversion_rates;
    }
    throw new Error('Invalid response from exchange rate API');
  } catch (error) {
    console.error('Failed to fetch live rates:', error.message);
    throw error;
  }
}

async function getRates() {
  try {
    // 1. Check cache in database
    const { data: cachedRates, error: cacheError } = await supabaseAdmin
      .from('exchange_rates')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (!cacheError && cachedRates) {
      const fetchedAt = new Date(cachedRates.fetched_at);
      const now = new Date();
      const hoursSinceFetch = (now - fetchedAt) / (1000 * 60 * 60);

      if (hoursSinceFetch < CACHE_DURATION_HOURS) {
         // Reconstruct rates object
         return {
           AED: 1.0,
           SAR: cachedRates.sar_rate,
           PKR: cachedRates.pkr_rate,
           source: 'cache',
           fetchedAt: cachedRates.fetched_at
         };
      }
    }

    // 2. Fetch new rates if cache missed or stale
    const liveRates = await fetchLiveRates();
    
    const newRateData = {
      base: BASE_CURRENCY,
      sar_rate: liveRates['SAR'] || 1.02,
      pkr_rate: liveRates['PKR'] || 76.5,
      fetched_at: new Date().toISOString()
    };

    // 3. Update cache asynchronously (fire and forget)
    supabaseAdmin.from('exchange_rates').insert([newRateData]).then(({error}) => {
       if (error) console.error('Failed to cache rates:', error.message);
    });

    return {
      AED: 1.0,
      SAR: newRateData.sar_rate,
      PKR: newRateData.pkr_rate,
      source: 'live',
      fetchedAt: newRateData.fetched_at
    };

  } catch (error) {
    console.error('Error getting rates:', error);
    // Return safe fallbacks on complete failure
    return { AED: 1.0, SAR: 1.02, PKR: 76.5, source: 'fallback' };
  }
}

module.exports = {
  getRates
};
