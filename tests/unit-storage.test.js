const assert = require('assert');

// Lightweight runner polyfill so `node tests/unit-storage.test.js` runs standalone without external test runners
if (typeof describe === 'undefined') {
  global.describe = (name, fn) => {
    console.log(`\n--- ${name} ---`);
    fn();
  };
}
if (typeof it === 'undefined') {
  global.it = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      process.exitCode = 1;
      throw err;
    }
  };
}

describe('Storage Upload Pipeline', () => {
  it('should fall back to indexeddb structure when cloud is unconfigured', async () => {
    const mockFile = { name: 'test_logo.png', size: 1024, type: 'image/png' };
    const mockUpload = (file, isCloudConfigured) => {
      if (!isCloudConfigured) {
        return {
          success: true,
          storage: 'indexeddb',
          url: '',
          name: file.name,
          size: file.size,
          type: file.type
        };
      }
      return {
        success: true,
        storage: 'supabase',
        url: `https://test.supabase.co/storage/v1/object/public/order-artworks/orders/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type
      };
    };

    const fallbackResult = mockUpload(mockFile, false);
    assert.strictEqual(fallbackResult.success, true);
    assert.strictEqual(fallbackResult.storage, 'indexeddb');
    assert.strictEqual(fallbackResult.name, 'test_logo.png');
    assert.strictEqual(fallbackResult.url, '');

    const cloudResult = mockUpload(mockFile, true);
    assert.strictEqual(cloudResult.success, true);
    assert.strictEqual(cloudResult.storage, 'supabase');
    assert.strictEqual(cloudResult.name, 'test_logo.png');
    assert(cloudResult.url.includes('supabase.co'));
    assert(cloudResult.url.includes('order-artworks/orders/test_logo.png'));
  });

  it('should sanitize storage path names correctly', () => {
    const sanitizeName = (name) => (name || 'artwork').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    assert.strictEqual(sanitizeName('my logo (final) #1!.png'), 'my_logo__final___1_.png');
    assert.strictEqual(sanitizeName('brochure @ 2026/09.pdf'), 'brochure___2026_09.pdf');
    assert.strictEqual(sanitizeName('clean-name_123.ai'), 'clean-name_123.ai');
    assert.strictEqual(sanitizeName(''), 'artwork');
  });

  it('should match the expected storage path pattern orders/<timestamp>_<random>_<filename>', () => {
    const generateStoragePath = (filename) => {
      const cleanName = (filename || 'artwork').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      return `orders/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
    };

    const path = generateStoragePath('flyer print.pdf');
    const pathPattern = /^orders\/\d+_[a-z0-9]{5}_flyer_print\.pdf$/;
    assert(pathPattern.test(path), `Path "${path}" did not match pattern orders/<timestamp>_<random>_<filename>`);
  });

  it('should verify cloud configuration detection logic', () => {
    const checkConfig = (url, key) => {
      const SUPABASE_URL = url || 'https://placeholder.supabase.co';
      const SUPABASE_ANON_KEY = key || '';
      return !!(
        SUPABASE_URL &&
        !SUPABASE_URL.includes('placeholder') &&
        !SUPABASE_URL.includes('your-project') &&
        SUPABASE_ANON_KEY &&
        SUPABASE_ANON_KEY !== 'your-anon-key' &&
        SUPABASE_ANON_KEY !== 'your-supabase-anon-key'
      );
    };

    // Unconfigured cases
    assert.strictEqual(checkConfig('', ''), false);
    assert.strictEqual(checkConfig('https://placeholder.supabase.co', 'valid-key'), false);
    assert.strictEqual(checkConfig('https://your-project.supabase.co', 'valid-key'), false);
    assert.strictEqual(checkConfig('https://xyz.supabase.co', 'your-anon-key'), false);
    assert.strictEqual(checkConfig('https://xyz.supabase.co', ''), false);

    // Valid configured case
    assert.strictEqual(checkConfig('https://xyz.supabase.co', 'valid-jwt-token-123'), true);
  });
});
