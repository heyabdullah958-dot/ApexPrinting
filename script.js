document.addEventListener('DOMContentLoaded', () => {
    
    // Define backend URL based on environment
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:3000' 
        : (window.location.origin.includes('vercel.app') ? window.location.origin : 'https://apex-printing.vercel.app');
    
    // Set current year in footer
    const yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // Scroll lock utility for mobile and overlays
    let scrollPos = 0;
    let isScrollLocked = false;
    window.lockBodyScroll = function() {
        if (isScrollLocked) return;
        scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPos}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        isScrollLocked = true;
    };
    window.unlockBodyScroll = function() {
        if (!isScrollLocked) return;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollPos);
        isScrollLocked = false;
    };

    // 1. Sticky Navbar & Glass Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // 2. Mobile Hamburger Menu & Backdrop
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    // Create mobile nav backdrop dynamically
    const navBackdrop = document.createElement('div');
    navBackdrop.className = 'nav-backdrop';
    document.body.appendChild(navBackdrop);

    function closeMobileMenu() {
        if (!navLinks.classList.contains('active')) return;
        navLinks.classList.remove('active');
        navBackdrop.classList.remove('active');
        window.unlockBodyScroll();
        const bars = hamburger.querySelectorAll('.bar');
        bars.forEach(bar => bar.style.transform = 'none');
        if (bars[1]) bars[1].style.opacity = '1';
    }

    function openMobileMenu() {
        if (navLinks.classList.contains('active')) return;
        navLinks.classList.add('active');
        navBackdrop.classList.add('active');
        window.lockBodyScroll();
        const bars = hamburger.querySelectorAll('.bar');
        if (bars.length >= 3) {
            bars[0].style.transform = 'translateY(7px) rotate(45deg)';
            bars[1].style.opacity = '0';
            bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
        }
    }
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close when backdrop is clicked
        navBackdrop.addEventListener('click', closeMobileMenu);

        // Close mobile menu when link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    // ESC Key listener to dismiss navigation or modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            if (typeof window.closeSignUpModal === 'function') {
                window.closeSignUpModal();
            }
            if (typeof window.closeProductModal === 'function') {
                window.closeProductModal();
            }
        }
    });

    // 3. Scroll Reveal Animation (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // Trigger counter animation if it's a stats item
                if (entry.target.classList.contains('stat-item')) {
                    const numberEl = entry.target.querySelector('.stat-number');
                    if (numberEl && numberEl.dataset.target && !numberEl.classList.contains('counted')) {
                        animateCounter(numberEl);
                    }
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 4. Counter Animation
    function animateCounter(el) {
        const target = +el.dataset.target;
        const duration = 2000; // 2 seconds
        const stepTime = Math.abs(Math.floor(duration / target));
        let current = 0;
        
        el.classList.add('counted');
        
        const timer = setInterval(() => {
            current += 1;
            el.textContent = current + (target >= 500 ? '+' : (target >= 15 ? '+' : ''));
            if (current >= target) {
                clearInterval(timer);
                el.textContent = target + (target >= 500 ? '+' : (target >= 15 ? '+' : ''));
            }
        }, stepTime);
    }

    // 5. Services Filter (services.html)
    const filterTabs = document.querySelectorAll('.filter-tab');
    const serviceCards = document.querySelectorAll('.service-item-card');

    if (filterTabs.length > 0 && serviceCards.length > 0) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');

                const filterValue = tab.dataset.filter;

                serviceCards.forEach(card => {
                    if (filterValue === 'all' || card.dataset.category === filterValue) {
                        card.style.display = 'flex';
                        // Trigger a reflow for animation
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // 6. Pre-fill Service Dropdown from URL Params (contact.html)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    const serviceDropdown = document.getElementById('service');
    
    if (serviceParam && serviceDropdown) {
        // Attempt to select the requested service
        const options = serviceDropdown.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === serviceParam) {
                serviceDropdown.selectedIndex = i;
                break;
            }
        }
    }

    // 6b. Dynamic Country & Phone Dial Code Synchronization (contact.html)
    const countrySelect = document.getElementById('country');
    const phoneInput = document.getElementById('phone');

    if (countrySelect && phoneInput) {
        const DIAL_CODE_MAP = {
            'UAE': { code: '+971', placeholder: '+971 50 123 4567' },
            'SAR': { code: '+966', placeholder: '+966 50 123 4567' },
            'PKR': { code: '+92', placeholder: '+92 300 1234567' },
            'Other': { code: '+', placeholder: '+XX XXX XXXXXXX' }
        };

        function getDialCodeConfig() {
            const selectedOpt = countrySelect.options[countrySelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset && selectedOpt.dataset.code) {
                const code = selectedOpt.dataset.code;
                const val = countrySelect.value;
                const placeholder = (DIAL_CODE_MAP[val] && DIAL_CODE_MAP[val].placeholder) || `${code} XX XXX XXXX`;
                return { code, placeholder };
            }
            const val = countrySelect.value || 'UAE';
            return DIAL_CODE_MAP[val] || DIAL_CODE_MAP['Other'];
        }

        function syncDialCode(forceValueUpdate = true) {
            const config = getDialCodeConfig();
            const newCode = config.code;
            phoneInput.placeholder = config.placeholder;

            if (!forceValueUpdate && !phoneInput.value) {
                return;
            }

            const currentVal = phoneInput.value.trim();

            if (!currentVal) {
                if (forceValueUpdate) {
                    phoneInput.value = newCode === '+' ? '+' : `${newCode} `;
                }
                return;
            }

            // Check if current value is only a dial code or plus
            const isJustPrefix = /^\+?(971|966|92|\d{1,4})?\s*$/.test(currentVal);
            if (isJustPrefix) {
                phoneInput.value = newCode === '+' ? '+' : `${newCode} `;
                return;
            }

            // Extract subscriber digits, stripping any previous country code (+971, +966, +92, etc.) or leading 0
            const prefixRegex = /^(?:\+?(?:971|966|92|\d{1,4})|00(?:971|966|92|\d{1,4}))?[\s\-\.]*(?:0)?(.*)$/;
            const match = currentVal.match(prefixRegex);
            const subscriber = match && match[1] ? match[1].trim() : currentVal.replace(/^\+?\d{1,4}\s*/, '').trim();

            if (subscriber) {
                phoneInput.value = newCode === '+' ? `+${subscriber}` : `${newCode} ${subscriber}`;
            } else {
                phoneInput.value = newCode === '+' ? '+' : `${newCode} `;
            }
        }

        countrySelect.addEventListener('change', () => syncDialCode(true));

        function handlePhoneFocus() {
            if (!phoneInput.value.trim()) {
                const config = getDialCodeConfig();
                phoneInput.value = config.code === '+' ? '+' : `${config.code} `;
            }
        }

        phoneInput.addEventListener('focus', handlePhoneFocus);
        phoneInput.addEventListener('click', handlePhoneFocus);

        // Initialize state on page load
        syncDialCode(false);
    }

    // 7. Contact Form Validation (contact.html)
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (formError) formError.style.display = 'none';
            
            let isValid = true;
            
            // Validate First Name
            const firstName = document.getElementById('firstName');
            if (!firstName.value.trim()) {
                showError(firstName);
                isValid = false;
            } else {
                removeError(firstName);
            }
            
            // Validate Last Name
            const lastName = document.getElementById('lastName');
            if (!lastName.value.trim()) {
                showError(lastName);
                isValid = false;
            } else {
                removeError(lastName);
            }
            
            // Validate Email
            const email = document.getElementById('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value)) {
                showError(email);
                isValid = false;
            } else {
                removeError(email);
            }
            
            // Validate Service Dropdown
            const service = document.getElementById('service');
            if (!service.value) {
                showError(service);
                isValid = false;
            } else {
                removeError(service);
            }
            
            // Validate Message
            const message = document.getElementById('message');
            if (!message.value.trim()) {
                showError(message);
                isValid = false;
            } else {
                removeError(message);
            }
            
            if (isValid) {
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;">Submitting Request...</span>';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
                
                const fullName = `${firstName.value.trim()} ${lastName.value.trim()}`;
                const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
                const country = document.getElementById('country') ? document.getElementById('country').value : '';
                const fileInput = document.getElementById('design_file');
                const designFile = fileInput && fileInput.files ? fileInput.files[0] : null;
                
                const formData = new FormData();
                formData.append('name', fullName);
                formData.append('email', email.value.trim());
                formData.append('phone', phone);
                formData.append('country', country);
                formData.append('service', service.value);
                formData.append('message', message.value.trim());
                if (designFile) {
                    formData.append('design_file', designFile);
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/api/contact`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'Error submitting order request');
                    }

                    contactForm.style.display = 'none';
                    if (formSuccess) {
                        formSuccess.style.display = 'block';
                        formSuccess.style.animation = 'fadeIn 0.5s ease backwards';
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('Your order request has been submitted successfully!', 'success');
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    if (formError) {
                        formError.textContent = error.message || 'There was an error sending your request. Please try again.';
                        formError.style.display = 'block';
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast(error.message || 'Failed to submit order request', 'error');
                    }
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            }
        });
    }

    function showError(inputElement) {
        inputElement.closest('.form-group').classList.add('error');
    }
    
    function removeError(inputElement) {
        inputElement.closest('.form-group').classList.remove('error');
    }

});

// PDF.js Preview Logic
document.addEventListener('DOMContentLoaded', () => {
    const canvases = document.querySelectorAll('canvas.pdf-preview');
    if (canvases.length > 0 && typeof pdfjsLib !== 'undefined') {
        const renderTask = async (canvas) => {
            const pdfPath = canvas.getAttribute('data-pdf');
            if (!pdfPath) return;
            try {
                const loadingTask = pdfjsLib.getDocument(pdfPath);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                
                const viewport = page.getViewport({ scale: 1.5 });
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                // Hide loading spinner
                const container = canvas.closest('.pdf-container');
                const spinner = container.querySelector('.loading-spinner');
                if (spinner) spinner.style.display = 'none';
            } catch (error) {
                console.error('Error rendering PDF:', pdfPath, error);
            }
        };

        // Use IntersectionObserver to load PDFs only when they scroll into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    renderTask(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });

        canvases.forEach(canvas => observer.observe(canvas));
    }
});

// Sign Up / Auth Modal Logic
window.openSignUpModal = function() {
    const signupModal = document.getElementById('signupModal');
    if(signupModal) {
        signupModal.classList.add('active');
        window.lockBodyScroll();
    }
};

window.closeSignUpModal = function() {
    const signupModal = document.getElementById('signupModal');
    if(signupModal) {
        signupModal.classList.remove('active');
        window.unlockBodyScroll();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const signupModal = document.getElementById('signupModal');
    if(signupModal) {
        signupModal.addEventListener('click', (e) => {
            if (e.target === signupModal) {
                window.closeSignUpModal();
            }
        });
    }
});

// Product Details Modal Logic
const NCR_PRICING_TABLE = {
  "8*5.5": {
    "2 PAGES": { "50": { 10: 5300, 20: 7500, 50: 15000, 100: 30000 }, "100": { 10: 7000, 20: 11000, 50: 26000, 100: 50000 } },
    "3 PAGES": { "50": { 10: 7500, 20: 11000, 50: 20000, 100: 40500 }, "100": { 10: 10000, 20: 15500, 50: 36000, 100: 69500 } },
    "4  PAGES": { "50": { 10: 9700, 20: 13500, 50: 26000, 100: 51000 }, "100": { 10: 12000, 20: 20000, 50: 47000, 100: 90000 } }
  },
  "8*11.5": {
    "2 PAGES": { "50": { 10: 7500, 20: 11500, 50: 26000, 100: 48000 }, "100": { 10: 11000, 20: 18700, 50: 44000, 100: 87000 } },
    "3 PAGES": { "50": { 10: 12000, 20: 17000, 50: 39000, 100: 73000 }, "100": { 10: 15500, 20: 29000, 50: 67000, 100: 140000 } },
    "4  PAGES": { "50": { 10: 14000, 20: 22000, 50: 50000, 100: 93000 }, "100": { 10: 21000, 20: 36000, 50: 86000, 100: 170000 } }
  },
  "4.25*5.5": {
    "2 PAGES": { "50": { 10: 6000, 20: 7000, 50: 12500, 100: 21000 }, "100": { 10: 7500, 20: 10000, 50: 16000, 100: 31500 } },
    "3 PAGES": { "50": { 10: 7000, 20: 9000, 50: 15500, 100: 26000 }, "100": { 10: 9500, 20: 14300, 50: 21500, 100: 42000 } },
    "4  PAGES": { "50": { 10: 8500, 20: 11000, 50: 19000, 100: 32000 }, "100": { 10: 11500, 20: 17000, 50: 27000, 100: 52500 } }
  },
  "8*8.5": {
    "2 PAGES": { "50": { 10: 6000, 20: 10000, 50: 18500, 100: 37000 }, "100": { 10: 9000, 20: 13500, 50: 32000, 100: 60000 } },
    "3 PAGES": { "50": { 10: 9000, 20: 13000, 50: 25000, 100: 50000 }, "100": { 10: 11000, 20: 19000, 50: 45000, 100: 85000 } },
    "4  PAGES": { "50": { 10: 11000, 20: 16000, 50: 32000, 100: 63000 }, "100": { 10: 15500, 20: 26000, 50: 58000, 100: 110000 } }
  }
};

const BROCHURE_PRICING_TABLE = {
  "8.5*12": {
    "113GSM": { 100: 13500, 250: 14200, 500: 15400, 1000: 17700, 2000: 28500, 3000: 39500, 5000: 60500 },
    "128GSM": { 100: 13900, 250: 14400, 500: 16000, 1000: 18500, 2000: 31000, 3000: 41500, 5000: 63500 },
    "148GSM": { 100: 14000, 250: 14800, 500: 16000, 1000: 19500, 2000: 31500, 3000: 43500, 5000: 67500 }
  },
  "17*12": {
    "113GSM": { 100: 14460, 250: 15860, 500: 18160, 1000: 22860, 2000: 38500, 3000: 53760, 5000: 83660 },
    "128GSM": { 100: 14660, 250: 16360, 500: 18860, 1000: 24260, 2000: 40600, 3000: 57300, 5000: 89860 },
    "148GSM": { 100: 15060, 250: 16860, 500: 20160, 1000: 26360, 2000: 44400, 3000: 62300, 5000: 98630 }
  },
  "11*24": {
    "113GSM": { 100: 26800, 250: 28700, 500: 32000, 1000: 38000, 2000: 62800, 3000: 87500, 5000: 137000 },
    "128GSM": { 100: 27200, 250: 29300, 500: 33000, 1000: 40000, 2000: 67000, 3000: 92500, 5000: 146000 },
    "148GSM": { 100: 27900, 250: 30500, 500: 34400, 1000: 42500, 2000: 71500, 3000: 100000, 5000: 160000 }
  }
};

const BOOKLET_PRICING_TABLE = {
  "8.5*11": {
    "300gsm": { 100: 40000, 250: 52500, 500: 74500, 1000: 119000, 1500: 168000, 2000: 212000, 3000: 307000 },
    "self_cover": { 100: 28000, 250: 35000, 500: 46000, 1000: 70000, 1500: 100000, 2000: 124000, 3000: 178000 },
    "leaves": {
      "4": { 100: 26500, 250: 28000, 500: 30700, 1000: 36000, 1500: 42000, 2000: 48000, 3000: 70000 },
      "8": { 100: 29000, 250: 32000, 500: 37000, 1000: 48000, 1500: 70300, 2000: 81000, 3000: 114000 },
      "12": { 100: 55500, 250: 60000, 500: 67700, 1000: 84000, 1500: 112300, 2000: 129000, 3000: 184000 },
      "16": { 100: 58000, 250: 64000, 500: 74000, 1000: 96000, 1500: 140600, 2000: 162000, 3000: 228000 },
      "24": { 100: 87000, 250: 96000, 500: 111000, 1000: 144000, 1500: 210900, 2000: 243000, 3000: 342000 },
      "32": { 100: 116000, 250: 128000, 500: 148000, 1000: 192000, 1500: 281200, 2000: 324000, 3000: 456000 }
    },
    "binding": {
      "saddle": { 100: 4000, 250: 6500, 500: 9000, 1000: 16500, 1500: 24000, 2000: 31500, 3000: 46500 },
      "spiral": { 100: 8000, 250: 20000, 500: 40000, 1000: 75000, 1500: 112500, 2000: 150000, 3000: 225000 }
    }
  },
  "5.5*8.5": {
    "300gsm": { 100: 26000, 250: 33000, 500: 44000, 1000: 65800, 1500: 94000, 2000: 115000, 3000: 165000 },
    "self_cover": { 100: 25000, 250: 30500, 500: 40500, 1000: 60500, 1500: 86000, 2000: 106000, 3000: 153000 },
    "leaves": {
      "4": { 100: 16000, 250: 16300, 500: 17800, 1000: 20500, 1500: 30000, 2000: 33000, 3000: 45000 },
      "8": { 100: 32000, 250: 32600, 500: 35600, 1000: 41000, 1500: 60000, 2000: 66000, 3000: 90000 },
      "12": { 100: 48000, 250: 48900, 500: 53400, 1000: 61500, 1500: 90000, 2000: 99000, 3000: 135000 },
      "16": { 100: 64000, 250: 65200, 500: 71200, 1000: 82000, 1500: 120000, 2000: 132000, 3000: 180000 },
      "24": { 100: 96000, 250: 97800, 500: 106800, 1000: 123000, 1500: 180000, 2000: 198000, 3000: 270000 },
      "32": { 100: 128000, 250: 130400, 500: 142400, 1000: 164000, 1500: 240000, 2000: 264000, 3000: 360000 }
    },
    "binding": {
      "saddle": { 100: 4000, 250: 6500, 500: 6500, 1000: 11500, 1500: 17000, 2000: 22000, 3000: 32000 },
      "spiral": { 100: 6500, 250: 16250, 500: 32500, 1000: 60000, 1500: 90000, 2000: 120000, 3000: 180000 }
    }
  }
};

const FLYER_PRICING_TABLE = {
  "8.5*11": {
    "113GSM": { 100: 8100, 250: 8800, 500: 10000, 1000: 12300, 2000: 19800, 3000: 27000, 5000: 41800 },
    "128GSM": { 100: 8250, 250: 9000, 500: 10400, 1000: 13000, 2000: 21000, 3000: 29000, 5000: 45000 },
    "150GSM": { 100: 8400, 250: 9300, 500: 10900, 1000: 14000, 2000: 22800, 3000: 31500, 5000: 49000 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 5600, 3000: 7600, 5000: 11600 }
  },
  "5.5*8.5": {
    "113GSM": { 100: 8000, 250: 8100, 500: 8700, 1000: 9800, 2000: 12100, 3000: 17100, 5000: 24500 },
    "128GSM": { 100: 8000, 250: 8200, 500: 8900, 1000: 10100, 2000: 12800, 3000: 18100, 5000: 26000 },
    "150GSM": { 100: 8000, 250: 8300, 500: 9100, 1000: 11000, 2000: 13800, 3000: 20000, 5000: 28500 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 3600, 3000: 5600, 5000: 7600 }
  }
};

const POSTER_PRICING_TABLE = {
  "8.5*12": {
    "113GSM": { 100: 8600, 250: 9300, 500: 10500, 1000: 12800, 2000: 20800, 3000: 28500, 5000: 44300 },
    "128GSM": { 100: 8750, 250: 9500, 500: 10900, 1000: 13500, 2000: 22000, 3000: 30500, 5000: 47500 },
    "148GSM": { 100: 8900, 250: 9800, 500: 11400, 1000: 14500, 2000: 23800, 3000: 33000, 5000: 51500 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 5600, 3000: 7600, 5000: 11600 }
  },
  "17*12": {
    "113GSM": { 100: 9600, 250: 11000, 500: 13300, 1000: 18000, 2000: 31000, 3000: 43500, 5000: 68000 },
    "128GSM": { 100: 9800, 250: 11500, 500: 14000, 1000: 19400, 2000: 33000, 3000: 47000, 5000: 74200 },
    "148GSM": { 100: 10200, 250: 12000, 500: 15300, 1000: 21500, 2000: 36800, 3000: 52000, 5000: 82700 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 5600, 3000: 7600, 5000: 11600 }
  },
  "17*24": {
    "113GSM": { 100: 17600, 250: 20800, 500: 25300, 1000: 36600, 2000: 61600, 3000: 89200, 5000: 139000 },
    "128GSM": { 100: 18100, 250: 21300, 500: 26800, 1000: 39800, 2000: 66100, 3000: 97400, 5000: 150000 },
    "148GSM": { 100: 18900, 250: 22600, 500: 28800, 1000: 42600, 2000: 74100, 3000: 107400, 5000: 169000 },
    "double_side": { 100: 6600, 250: 6600, 500: 6600, 1000: 6600, 2000: 10200, 3000: 13800, 5000: 21000 }
  }
};

const LETTERHEAD_PRICING_TABLE = {
  "100gsm": { 100: 8000, 250: 8600, 500: 9800, 1000: 11700, 2000: 18500, 3000: 25400, 5000: 33500 },
  "80gsm": { 100: 7900, 250: 8350, 500: 9130, 1000: 11000, 2000: 17000, 3000: 23000, 5000: 29500 },
  "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 5600, 3000: 7600, 5000: 11600 }
};

const PRESENTATION_FOLDER_PRICING_TABLE = {
  "die_cut": {
    "300gsm": { 100: 28400, 250: 38900, 500: 52400, 1000: 86400, 2000: 159800, 3000: 237200, 5000: 374000 },
    "350gsm": { 100: 29400, 250: 39900, 500: 55400, 1000: 93400, 2000: 169800, 3000: 254200, 5000: 402000 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 7200, 3000: 10800, 5000: 18000 },
    "lamination": { 100: 10000, 250: 15000, 500: 23000, 1000: 40000, 2000: 73000, 3000: 100000, 5000: 173000 }
  },
  "with_pockets": {
    "300gsm": { 100: 23000, 250: 27650, 500: 35700, 1000: 51800, 2000: 92000, 3000: 131600, 5000: 211500 },
    "350gsm": { 100: 24000, 250: 29250, 500: 38500, 1000: 56500, 2000: 100800, 3000: 144000, 5000: 231000 },
    "double_side": { 100: 3600, 250: 3600, 500: 3600, 1000: 3600, 2000: 7200, 3000: 10800, 5000: 18000 },
    "pocket_pasting": { 100: 7300, 250: 8700, 500: 10900, 1000: 15000, 2000: 23500, 3000: 32200, 5000: 52300 },
    "lamination": { 100: 7500, 250: 11250, 500: 17500, 1000: 30000, 2000: 55000, 3000: 80000, 5000: 130000 }
  }
};

const PRODUCT_DATA = {
    "Business Cards": {
        basePrice: 14.99,
        desc: "Make a lasting first impression with premium business cards. Choose from luxury finishes, special effects, and multiple sizes.",
        requiresQuote: false,
        options: {
            "Paper Stock": { "Standard 14pt / 300 GSM": 0, "Premium 16pt / 350 GSM": 3, "Luxury 450+ GSM": 8 },
            "Sides": { "One Side": 0, "Both Sides": 2 },
            "Lamination": { "No Lamination": 0, "Matt Lamination": 2, "Gloss Lamination": 2 },
            "Corners": { "Straight Cut": 0, "Round Corners 3mm": 1.5, "Round Corners 6mm": 1.5, "Custom Shape": 5 },
            "Special Effects": { "None": 0, "Spot UV Coating": 4, "Embossing": 6, "Foil Stamping": 7 },
            "Quantity": { "50 units": 0, "100 units": 0, "250 units": 8, "500 units": 15, "1000 units": 25 }
        }
    },
    "Flyers": {
        basePrice: 0,
        desc: "Eye-catching flyers in multiple sizes and finishes to promote your business, events, or services effectively.",
        requiresQuote: false,
        options: {
            "Size": { "5.5x8.5\"": "5.5*8.5", "8.5x11\"": "8.5*11" },
            "Paper Stock": { "113 GSM": "113GSM", "128 GSM": "128GSM", "150 GSM": "150GSM" },
            "Sides": { "One Side": "one_side", "Both Sides": "both_sides" },
            "Paper Finish": { "Matt": "Matt", "Glossy": "Glossy" },
            "Quantity": { "100 units": "100", "250 units": "250", "500 units": "500", "1000 units": "1000", "2000 units": "2000", "3000 units": "3000", "5000 units": "5000" }
        }
    },
    "Posters": {
        basePrice: 0,
        desc: "Bold, vibrant posters in multiple sizes to display your brand, events, or promotions with maximum visual impact.",
        requiresQuote: false,
        options: {
            "Size": { "8.5x12\"": "8.5*12", "12x17\"": "17*12", "17x24\"": "17*24" },
            "Paper Stock": { "113 GSM": "113GSM", "128 GSM": "128GSM", "150 GSM": "148GSM" },
            "Sides": { "One Side": "one_side", "Both Sides": "both_sides" },
            "Paper Finish": { "Matt": "Matt", "Glossy": "Glossy" },
            "Quantity": { "100 units": "100", "250 units": "250", "500 units": "500", "1000 units": "1000", "2000 units": "2000", "3000 units": "3000", "5000 units": "5000" }
        }
    },
    "Presentation Folders": {
        basePrice: 0,
        desc: "Professional presentation folders that organize your materials with a polished, branded look that impresses clients.",
        requiresQuote: false,
        options: {
            "Size": { "9x12\" (With Pockets)": "9*12_pockets", "12x18\" (Die Cut, No Pockets)": "12*18_die_cut" },
            "Paper Stock": { "300 GSM": "300gsm", "350 GSM": "350gsm" },
            "Sides": { "One Side": "one_side", "Both Sides": "both_sides" },
            "Pockets": { "Right Pocket Only": "right_pocket", "Both Pockets": "both_pockets" },
            "Lamination": { "No Lamination": "no_lamination", "Matt Lamination": "lamination", "Gloss Lamination": "lamination" },
            "Quantity": { "100 units": "100", "250 units": "250", "500 units": "500", "1000 units": "1000", "2000 units": "2000", "3000 units": "3000", "5000 units": "5000" }
        }
    },
    "Letterhead": {
        basePrice: 0,
        desc: "Branded letterhead that communicates professionalism in every piece of correspondence you send.",
        requiresQuote: false,
        options: {
            "Size": { "Letter (8.5x11\")": "8.5*11" },
            "Paper Stock": { "80 GSM": "80gsm", "100 GSM": "100gsm" },
            "Sides": { "One Side": "one_side", "Both Sides": "both_sides" },
            "Finishing": { "Straight Cut": "straight", "Padding (100 sheets)": "padding" },
            "Quantity": { "100 sheets": "100", "250 sheets": "250", "500 sheets": "500", "1000 sheets": "1000", "2000 sheets": "2000", "3000 sheets": "3000", "5000 sheets": "5000" }
        }
    },
    "Envelopes": {
        basePrice: 11.99,
        desc: "Custom-printed envelopes that reinforce your brand identity from the very first touch point.",
        requiresQuote: false,
        options: {
            "Size": { "4.25x6.25\" (Invitation)": 0, "4.125x9.5\" (Standard)": 0, "6\"x9\"": 1.5, "3.875\"x8.875\"": 1, "9\"x12\"": 2, "5.25\"x7.25\"": 0.5 },
            "Sides": { "One Side": 0, "Both Sides": 2 },
            "Quantity": { "50 units": 0, "100 units": 0, "250 units": 7, "500 units": 13 }
        }
    },
    "Notepads": {
        basePrice: 13.99,
        desc: "Branded notepads that keep your company name on desks and in hands throughout every workday.",
        requiresQuote: false,
        options: {
            "Size": { "4x5.5\"": 0, "5x8\"": 1, "5.5x8.5\"": 2, "8.5x11\"": 4 },
            "Paper Stock": { "80 GSM (20lb bond)": 0, "90 GSM (24lb bond)": 1, "105 GSM (28lb bond)": 2 },
            "Pages": { "25 pages": 0, "50 pages": 3, "100 pages": 6 },
            "Quantity": { "10 pads": 0, "25 pads": 6, "50 pads": 12 }
        }
    },
    "Brochures": {
        basePrice: 0,
        desc: "Multi-fold brochures that tell your brand story beautifully. Perfect for sales presentations and events.",
        requiresQuote: false,
        options: {
            "Size": { "6x9\"": "8.5*12", "8.5x11\"": "8.5*12", "11x17\"": "17*12", "11.5x24\"": "11*24" },
            "Paper Stock": { "113 GSM": "113GSM", "128 GSM": "128GSM", "148 GSM": "148GSM" },
            "Fold Type": { "Bi-fold": "Bi-fold", "Tri-fold": "Tri-fold", "Gate Fold": "Gate Fold", "Z-fold": "Z-fold" },
            "Lamination": { "Matt": "Matt", "Glossy": "Glossy" },
            "Quantity": { "100 units": "100", "250 units": "250", "500 units": "500", "1000 units": "1000", "2000 units": "2000", "3000 units": "3000", "5000 units": "5000" }
        }
    },
    "Booklets": {
        basePrice: 0,
        desc: "Professional booklets for catalogs, manuals, and marketing collateral with premium binding options.",
        requiresQuote: false,
        options: {
            "Size": { "5.5x8.5\"": "5.5*8.5", "8.5x11\"": "8.5*11" },
            "Pages": { "8 Pages (4 leaves)": "4", "16 Pages (8 leaves)": "8", "24 Pages (12 leaves)": "12", "32 Pages (16 leaves)": "16", "48 Pages (24 leaves)": "24", "64 Pages (32 leaves)": "32" },
            "Cover Stock": { "Self Cover": "self_cover", "300 GSM Cover": "300gsm" },
            "Binding": { "Saddle Stitch": "saddle", "Spiral Binding": "spiral" },
            "Lamination": { "Matt": "Matt", "Glossy": "Glossy" },
            "Quantity": { "100 units": "100", "250 units": "250", "500 units": "500", "1000 units": "1000", "1500 units": "1500", "2000 units": "2000", "3000 units": "3000" }
        }
    },
    "Promotional Pads": {
        basePrice: 15.99,
        desc: "Branded writing pads that keep your logo visible and useful on every desk, every day.",
        requiresQuote: false,
        options: {
            "Size": { "4x5.5\"": 0, "5x8\"": 2, "5.5x8.5\"": 2, "8.5x11\"": 4 },
            "Paper Stock": { "Economy 70 GSM": 0, "Standard 100 GSM": 2 },
            "Pages": { "25 pages": 0, "50 pages": 3, "100 pages": 6 },
            "Front Cover": { "No Cover": 0, "200 GSM Cover": 2, "300 GSM Cover": 4 },
            "Perforation": { "No Perforation": 0, "With Perforation": 1.5 },
            "Quantity": { "10 pads": 0, "25 pads": 7, "50 pads": 14 }
        }
    },
    "NCR Forms": {
        basePrice: 0,
        desc: "No Carbon Required multi-part forms ideal for invoices, receipts, and order forms with automatic duplicate copies.",
        requiresQuote: false,
        options: {
            "Size": { "4.25x5.5\"": "4.25*5.5", "5.5x8.5\"": "8*5.5", "8.5x11\"": "8*11.5", "8x8.5\"": "8*8.5" },
            "Parts": { "2-Part (White+Yellow)": "2 PAGES", "3-Part (White+Yellow+Pink)": "3 PAGES", "4-Part (White+Yellow+Pink+Blue)": "4  PAGES" },
            "Sets": { "50 sets": "50", "100 sets": "100" },
            "Quantity": { "10 books": "10", "20 books": "20", "50 books": "50", "100 books": "100" }
        }
    },
    "Paper Bags": {
        basePrice: 22.99,
        desc: "Elegant branded paper bags with premium handles to turn your packaging into a powerful brand statement.",
        requiresQuote: true,
        options: {
            "Size": {
                "5.5 x 3.25 x 8.375": 0, "5.5 x 3.25 x 13": 2, "8 x 4.75 x 8": 3, "8 x 4.75 x 10.25": 4,
                "10 x 5 x 10": 5, "10 x 5 x 13": 6, "13 x 6 x 16": 8, "13 x 7 x 13": 8, "13 x 7 x 17": 9,
                "14.5 x 9 x 16.25": 10, "16 x 6 x 12": 10, "16 x 6 x 16": 11, "16 x 6 x 19": 12, "18 x 7 x 18": 13
            },
            "Paper Stock": { "Economy 115 GSM": 0, "Standard 150 GSM": 2, "200 GSM": 4, "Premium 250 GSM": 7 },
            "Lamination": { "No Lamination": 0, "Matt": 2, "Gloss": 2 },
            "Handle Type": { "Cotton Rope": 0, "Ribbon": 1.5 },
            "Special Effects": { "None": 0, "Spot UV": 4, "Foil Stamping": 6 },
            "Eyelets": { "No Eyelets": 0, "With Eyelets": 1 },
            "Quantity": { "25 units": 0, "50 units": 8, "100 units": 15, "250 units": 28 }
        }
    },
    // New Products requiring Quote
    "Gift Boxes": {
        basePrice: 45.00,
        desc: "High-end rigid gift boxes with custom branding details, perfect for luxury retail and special product launches.",
        requiresQuote: true,
        options: {
            "Size": { "Small (4\"x4\"x2\")": 0, "Medium (6\"x6\"x4\")": 5, "Large (8\"x8\"x4\")": 10, "Custom Size": 15 },
            "Material": { "Standard Kraft Cardboard": 0, "Premium Rigid Chipboard": 20 },
            "Quantity": { "50 units": 0, "100 units": 15, "250 units": 35, "500 units": 60 }
        }
    },
    "Packaging Boxes": {
        basePrice: 35.00,
        desc: "Custom printed product packaging boxes, designed for retail shelves and premium shipping presentation.",
        requiresQuote: true,
        options: {
            "Size": { "Small Box (3\"x3\"x1.2\")": 0, "Medium Box (5\"x5\"x2.5\")": 4, "Large Box (8\"x5\"x3\")": 8 },
            "Material": { "18pt White SBS Cardboard": 0, "18pt Kraft SBS Cardboard": 2 },
            "Quantity": { "100 units": 0, "250": 20, "500": 40 }
        }
    },
    "Hang Tags": {
        basePrice: 15.00,
        desc: "Custom branded hang tags with high quality printing and strings to give your merchandise a premium feel.",
        requiresQuote: true,
        options: {
            "Size": { "Standard Rectangular (2\"x3.5\")": 0, "Circular (2.5\")": 2, "Folded Tag": 3 },
            "Paper Stock": { "14pt Matte Cardstock": 0, "16pt Gloss Cardstock": 1.5, "Natural Kraft Cardstock": 2 },
            "Quantity": { "100 units": 0, "250": 6, "500": 12 }
        }
    },
    "Shipping Boxes": {
        basePrice: 55.00,
        desc: "Heavy-duty corrugated shipping boxes custom printed with your logo, built to withstand transit in style.",
        requiresQuote: true,
        options: {
            "Size": { "6\"x6\"x6\"": 0, "8\"x8\"x8\"": 4, "10\"x10\"x10\"": 8, "12\"x12\"x12\"": 12 },
            "Material": { "Single-Wall Corrugated": 0, "Double-Wall Heavy Duty": 8 },
            "Quantity": { "25 units": 0, "50": 12, "100": 22 }
        }
    },
    "Mugs": {
        basePrice: 10.00,
        desc: "Branded ceramic coffee mugs printed in full color. Excellent promotional giveaway item.",
        requiresQuote: true,
        options: {
            "Size": { "11 oz": 0, "15 oz": 2 },
            "Color": { "Classic White": 0, "Two-Tone Accent": 1.5, "Full Black": 2 },
            "Quantity": { "12 units": 0, "24": 8, "48": 15, "96": 28 }
        }
    },
    "Magic Mugs": {
        basePrice: 15.00,
        desc: "Heat-sensitive color-changing mugs that reveal your design when hot liquid is poured in.",
        requiresQuote: true,
        options: {
            "Size": { "11 oz": 0, "15 oz": 3 },
            "Quantity": { "12 units": 0, "24": 12, "48": 22 }
        }
    },
    "Caps": {
        basePrice: 12.00,
        desc: "Premium quality custom embroidered caps, trucker hats, and dad caps to promote your brand.",
        requiresQuote: true,
        options: {
            "Style": { "Trucker Cap": 0, "Baseball Cap": 2, "Dad Hat": 3 },
            "Decoration": { "Embroidery (Front)": 0, "Embroidery (Front & Side)": 4, "Patch (Front)": 3 },
            "Quantity": { "12 units": 0, "24": 10, "48": 18, "96": 32 }
        }
    },
    "T-Shirts": {
        basePrice: 18.00,
        desc: "High quality custom printed and embroidered t-shirts in various fits and soft ring-spun cotton fabrics.",
        requiresQuote: true,
        options: {
            "Size": { "S": 0, "M": 0, "L": 0, "XL": 0, "XXL": 2.50 },
            "Material": { "100% Cotton": 0, "Premium Tri-Blend": 3, "Organic Cotton": 4 },
            "Quantity": { "10 units": 0, "25": 15, "50": 28, "100": 50 }
        }
    },
    "Pens": {
        basePrice: 1.50,
        desc: "Custom printed click pens, gel pens, and heavy executive metal pens branded with your business logo.",
        requiresQuote: true,
        options: {
            "Style": { "Click Plastic Pen": 0, "Executive Metal Pen": 2.50, "Soft-Touch Gel Pen": 1 },
            "Quantity": { "50 units": 0, "100": 8, "250": 18, "500": 32 }
        }
    },
    "Water Bottles": {
        basePrice: 20.00,
        desc: "Insulated double-wall stainless steel sports bottles custom engraved or printed to keep drinks cold for hours.",
        requiresQuote: true,
        options: {
            "Size": { "17 oz": 0, "20 oz": 2, "24 oz": 4 },
            "Type": { "Single-Wall Steel": 0, "Double-Wall Insulated": 5 },
            "Quantity": { "12 units": 0, "24": 12, "48": 22 }
        }
    }
};

// Map card titles to PRODUCT_DATA keys
function getCompetitorKey(title) {
    const norm = title.trim().toLowerCase();
    if (norm === 'business card') return 'Business Cards';
    if (norm === 'flyer') return 'Flyers';
    if (norm === 'notepad') return 'Notepads';
    if (norm === 'note pads') return 'Notepads';
    if (norm === 'brochure') return 'Brochures';
    if (norm === 'booklet') return 'Booklets';
    if (norm === 'promotional pads') return 'Promotional Pads';
    if (norm === 'ncr forms') return 'NCR Forms';
    if (norm === 'paper bags') return 'Paper Bags';
    if (norm === 'gift boxes') return 'Gift Boxes';
    if (norm === 'packaging boxes') return 'Packaging Boxes';
    if (norm === 'hang tags') return 'Hang Tags';
    if (norm === 'shipping boxes') return 'Shipping Boxes';
    if (norm === 'mugs') return 'Mugs';
    if (norm === 'magic mugs') return 'Magic Mugs';
    if (norm === 'caps') return 'Caps';
    if (norm === 't-shirts') return 'T-Shirts';
    if (norm === 'pens') return 'Pens';
    if (norm === 'water bottles') return 'Water Bottles';
    
    // Fallback search
    for (const key of Object.keys(PRODUCT_DATA)) {
        if (key.toLowerCase() === norm) return key;
    }
    return title;
}

window.closeProductModal = function() {
    const productModalOverlay = document.getElementById('productModal');
    const productModal = productModalOverlay ? productModalOverlay.querySelector('.product-modal') : null;
    if (productModalOverlay && productModal) {
        productModalOverlay.classList.remove('active');
        productModal.classList.remove('active');
        window.unlockBodyScroll();
    }
};

window.updatePrice = function() {
    const modalPrice = document.getElementById('modalPrice');
    const optionsContainer = document.getElementById('modalOptionsContainer');
    if (!modalPrice || !optionsContainer) return;
    
    const pricing = window.currentProductPricing || { basePrice: 10 };
    let totalPrice = pricing.basePrice;
    
    const modalTitle = document.getElementById('modalTitle')?.textContent || '';
    const mappedKey = getCompetitorKey(modalTitle);
    
    if (mappedKey === 'NCR Forms') {
        let size = '4.25*5.5';
        let parts = '2 PAGES';
        let sets = '50';
        let qty = 10;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Parts') parts = select.value;
            if (optName === 'Sets') sets = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 10);
        });
        
        let pkrPrice = 6000;
        try {
            if (NCR_PRICING_TABLE[size] && 
                NCR_PRICING_TABLE[size][parts] && 
                NCR_PRICING_TABLE[size][parts][sets] && 
                NCR_PRICING_TABLE[size][parts][sets][qty]) {
                pkrPrice = NCR_PRICING_TABLE[size][parts][sets][qty];
            } else {
                console.warn(`NCR Pricing lookup failed for Size: ${size}, Parts: ${parts}, Sets: ${sets}, Qty: ${qty}`);
            }
        } catch (e) {
            console.error("Error looking up NCR pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Brochures') {
        let size = '8.5*12';
        let stock = '113GSM';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Paper Stock') stock = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        let pkrPrice = 13500;
        try {
            if (BROCHURE_PRICING_TABLE[size] && 
                BROCHURE_PRICING_TABLE[size][stock] && 
                BROCHURE_PRICING_TABLE[size][stock][qty]) {
                pkrPrice = BROCHURE_PRICING_TABLE[size][stock][qty];
            } else {
                console.warn(`Brochure Pricing lookup failed for Size: ${size}, Stock: ${stock}, Qty: ${qty}`);
            }
        } catch (e) {
            console.error("Error looking up Brochure pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Booklets') {
        let size = '8.5*11';
        let pages = '4';
        let cover = '300gsm';
        let binding = 'saddle';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Pages') pages = select.value;
            if (optName === 'Cover Stock') cover = select.value;
            if (optName === 'Binding') binding = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        if (cover === 'self_cover' && binding === 'spiral') {
            modalPrice.textContent = "Not Available (Cannot spiral-bind paper covers)";
            return;
        }
        
        let pkrPrice = 0;
        try {
            if (BOOKLET_PRICING_TABLE[size]) {
                const sizeTable = BOOKLET_PRICING_TABLE[size];
                const coverPrice = sizeTable[cover] ? (sizeTable[cover][qty] || 0) : 0;
                const leavesPrice = (sizeTable.leaves && sizeTable.leaves[pages]) ? (sizeTable.leaves[pages][qty] || 0) : 0;
                const bindingPrice = (sizeTable.binding && sizeTable.binding[binding]) ? (sizeTable.binding[binding][qty] || 0) : 0;
                
                pkrPrice = coverPrice + leavesPrice + bindingPrice;
            } else {
                console.warn(`Booklet Pricing lookup failed for Size: ${size}`);
            }
        } catch (e) {
            console.error("Error looking up Booklet pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Flyers') {
        let size = '8.5*11';
        let stock = '113GSM';
        let sides = 'one_side';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Paper Stock') stock = select.value;
            if (optName === 'Sides') sides = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        let pkrPrice = 0;
        try {
            if (FLYER_PRICING_TABLE[size] && 
                FLYER_PRICING_TABLE[size][stock] && 
                FLYER_PRICING_TABLE[size][stock][qty] !== undefined) {
                
                const baseVal = FLYER_PRICING_TABLE[size][stock][qty];
                let doubleSideSurcharge = 0;
                if (sides === 'both_sides') {
                    doubleSideSurcharge = FLYER_PRICING_TABLE[size]["double_side"][qty] || 0;
                }
                
                pkrPrice = baseVal + doubleSideSurcharge;
            } else {
                console.warn(`Flyer Pricing lookup failed for Size: ${size}, Stock: ${stock}, Qty: ${qty}`);
            }
        } catch (e) {
            console.error("Error looking up Flyer pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Posters') {
        let size = '8.5*12';
        let stock = '113GSM';
        let sides = 'one_side';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Paper Stock') stock = select.value;
            if (optName === 'Sides') sides = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        let pkrPrice = 0;
        try {
            if (POSTER_PRICING_TABLE[size] && 
                POSTER_PRICING_TABLE[size][stock] && 
                POSTER_PRICING_TABLE[size][stock][qty] !== undefined) {
                
                const baseVal = POSTER_PRICING_TABLE[size][stock][qty];
                let doubleSideSurcharge = 0;
                if (sides === 'both_sides') {
                    doubleSideSurcharge = POSTER_PRICING_TABLE[size]["double_side"][qty] || 0;
                }
                
                pkrPrice = baseVal + doubleSideSurcharge;
            } else {
                console.warn(`Poster Pricing lookup failed for Size: ${size}, Stock: ${stock}, Qty: ${qty}`);
            }
        } catch (e) {
            console.error("Error looking up Poster pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Letterhead') {
        let stock = '100gsm';
        let sides = 'one_side';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Paper Stock') stock = select.value;
            if (optName === 'Sides') sides = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        let pkrPrice = 0;
        try {
            if (LETTERHEAD_PRICING_TABLE[stock] && 
                LETTERHEAD_PRICING_TABLE[stock][qty] !== undefined) {
                
                const baseVal = LETTERHEAD_PRICING_TABLE[stock][qty];
                let doubleSideSurcharge = 0;
                if (sides === 'both_sides') {
                    doubleSideSurcharge = LETTERHEAD_PRICING_TABLE["double_side"][qty] || 0;
                }
                
                pkrPrice = baseVal + doubleSideSurcharge;
            } else {
                console.warn(`Letterhead Pricing lookup failed for Stock: ${stock}, Qty: ${qty}`);
            }
        } catch (e) {
            console.error("Error looking up Letterhead pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else if (mappedKey === 'Presentation Folders') {
        let size = '9*12_pockets';
        let stock = '300gsm';
        let sides = 'one_side';
        let pockets = 'right_pocket';
        let lamination = 'no_lamination';
        let qty = 100;
        
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            const optName = select.dataset.optionName;
            if (optName === 'Size') size = select.value;
            if (optName === 'Paper Stock') stock = select.value;
            if (optName === 'Sides') sides = select.value;
            if (optName === 'Pockets') pockets = select.value;
            if (optName === 'Lamination') lamination = select.value;
            if (optName === 'Quantity') qty = parseInt(select.value || 100);
        });
        
        // Hide/Show Pockets dropdown based on selected Size
        const pocketsSelect = Array.from(selects).find(s => s.dataset.optionName === 'Pockets');
        if (pocketsSelect) {
            const pocketsGroup = pocketsSelect.closest('.form-group');
            if (pocketsGroup) {
                if (size === '12*18_die_cut') {
                    pocketsGroup.style.display = 'none';
                } else {
                    pocketsGroup.style.display = 'block';
                }
            }
        }
        
        let pkrPrice = 0;
        try {
            if (size === '12*18_die_cut') {
                if (PRESENTATION_FOLDER_PRICING_TABLE.die_cut && 
                    PRESENTATION_FOLDER_PRICING_TABLE.die_cut[stock] && 
                    PRESENTATION_FOLDER_PRICING_TABLE.die_cut[stock][qty] !== undefined) {
                    
                    const baseVal = PRESENTATION_FOLDER_PRICING_TABLE.die_cut[stock][qty];
                    let doubleSideSurcharge = 0;
                    if (sides === 'both_sides') {
                        doubleSideSurcharge = PRESENTATION_FOLDER_PRICING_TABLE.die_cut["double_side"][qty] || 0;
                    }
                    
                    let laminationSurcharge = 0;
                    if (lamination === 'lamination') {
                        laminationSurcharge = PRESENTATION_FOLDER_PRICING_TABLE.die_cut["lamination"][qty] || 0;
                    }
                    
                    pkrPrice = baseVal + doubleSideSurcharge + laminationSurcharge;
                } else {
                    console.warn(`Die Cut Folder lookup failed for Stock: ${stock}, Qty: ${qty}`);
                }
            } else {
                // With pockets
                if (PRESENTATION_FOLDER_PRICING_TABLE.with_pockets && 
                    PRESENTATION_FOLDER_PRICING_TABLE.with_pockets[stock] && 
                    PRESENTATION_FOLDER_PRICING_TABLE.with_pockets[stock][qty] !== undefined) {
                    
                    const baseVal = PRESENTATION_FOLDER_PRICING_TABLE.with_pockets[stock][qty];
                    let doubleSideSurcharge = 0;
                    if (sides === 'both_sides') {
                        doubleSideSurcharge = PRESENTATION_FOLDER_PRICING_TABLE.with_pockets["double_side"][qty] || 0;
                    }
                    
                    let pocketPastingSurcharge = PRESENTATION_FOLDER_PRICING_TABLE.with_pockets["pocket_pasting"][qty] || 0;
                    
                    let laminationSurcharge = 0;
                    if (lamination === 'lamination') {
                        laminationSurcharge = PRESENTATION_FOLDER_PRICING_TABLE.with_pockets["lamination"][qty] || 0;
                    }
                    
                    pkrPrice = baseVal + doubleSideSurcharge + pocketPastingSurcharge + laminationSurcharge;
                } else {
                    console.warn(`Pockets Folder lookup failed for Stock: ${stock}, Qty: ${qty}`);
                }
            }
        } catch (e) {
            console.error("Error looking up Presentation Folder pricing:", e);
        }
        
        const pkrRate = (EXCHANGE_RATES.PKR && EXCHANGE_RATES.PKR.rate) ? EXCHANGE_RATES.PKR.rate : 76.5;
        totalPrice = pkrPrice / pkrRate;
    } else {
        const selects = optionsContainer.querySelectorAll('select.modal-option-select');
        selects.forEach(select => {
            totalPrice += parseFloat(select.value || 0);
        });
    }
    
    modalPrice.textContent = window.formatPrice(totalPrice);
};

// Render multi-page preview thumbnails dynamically
async function loadPDFGallery(pdfPath, sourceCanvas) {
    const thumbnailRow = document.querySelector('.thumbnail-row');
    if (!thumbnailRow) return;
    
    thumbnailRow.innerHTML = '';
    
    if (!pdfPath || typeof pdfjsLib === 'undefined') {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail active';
        if (sourceCanvas) {
            const canvasCopy = document.createElement('canvas');
            canvasCopy.width = 50;
            canvasCopy.height = 50;
            const ctx = canvasCopy.getContext('2d');
            if (sourceCanvas && sourceCanvas.getContext) {
                ctx.drawImage(sourceCanvas, 0, 0, 50, 50);
            } else if (typeof sourceCanvas === 'string' || (sourceCanvas && sourceCanvas.tagName === 'IMG')) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0, 50, 50);
                img.src = typeof sourceCanvas === 'string' ? sourceCanvas : sourceCanvas.src;
            }
            thumb.appendChild(canvasCopy);
        } else {
            thumb.textContent = 'Page 1';
        }
        thumbnailRow.appendChild(thumb);
        return;
    }
    
    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        const maxThumbs = Math.min(totalPages, 5);
        
        for (let pageNum = 1; pageNum <= maxThumbs; pageNum++) {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = pageNum === 1 ? 'thumbnail active' : 'thumbnail';
            thumbDiv.dataset.page = pageNum;
            
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 60;
            thumbCanvas.height = 60;
            thumbDiv.appendChild(thumbCanvas);
            thumbnailRow.appendChild(thumbDiv);
            
            (async (num, canvas) => {
                try {
                    const page = await pdf.getPage(num);
                    const viewport = page.getViewport({ scale: 0.15 });
                    const context = canvas.getContext('2d');
                    
                    const scaledViewport = page.getViewport({ scale: canvas.width / page.getViewport({ scale: 1.0 }).width });
                    canvas.height = scaledViewport.height;
                    canvas.width = scaledViewport.width;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: scaledViewport
                    }).promise;
                } catch (e) {
                    console.error("Error rendering thumbnail page:", num, e);
                }
            })(pageNum, thumbCanvas);
            
            thumbDiv.addEventListener('click', async () => {
                thumbnailRow.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumbDiv.classList.add('active');
                
                const mainCanvas = document.getElementById('modalMainCanvas');
                const placeholder = document.getElementById('modalMainPlaceholder');
                if (placeholder) placeholder.style.display = 'block';
                
                try {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const context = mainCanvas.getContext('2d');
                    
                    mainCanvas.height = viewport.height;
                    mainCanvas.width = viewport.width;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    if (placeholder) placeholder.style.display = 'none';
                } catch (err) {
                    console.error("Error switching main preview page:", err);
                }
            });
        }
    } catch (error) {
        console.error('Error loading gallery for PDF:', pdfPath, error);
    }
}

// ===== MULTI-CURRENCY SUPPORT =====
let EXCHANGE_RATES = {
    AED: { rate: 1.0, symbol: 'AED ', suffix: '' },
    SAR: { rate: 1.02, symbol: 'SR ', suffix: '' },
    PKR: { rate: 76.5, symbol: 'Rs. ', suffix: '' }
};

// Pure Inquiry / Quote Flow (No prices displayed)
document.addEventListener('DOMContentLoaded', () => {

    // Initialize Currency Selector
    const currencySelectors = document.querySelectorAll('#currencySelector');
    currencySelectors.forEach(currencySelector => {
        currencySelector.value = window.getSelectedCurrency();
        currencySelector.addEventListener('change', (e) => {
            localStorage.setItem('selected_currency', e.target.value);
            // Sync all currency selectors on the page
            document.querySelectorAll('#currencySelector').forEach(select => {
                select.value = e.target.value;
            });
            // If the product modal is currently active, re-open it to refresh options and pricing!
            const productModalOverlay = document.getElementById('productModal');
            if (productModalOverlay && productModalOverlay.classList.contains('active')) {
                const title = document.getElementById('modalTitle')?.textContent;
                const desc = document.getElementById('modalDesc')?.textContent;
                const canvas = document.getElementById('modalMainCanvas');
                const pdfPath = canvas ? canvas.getAttribute('data-pdf-path') : null;
                window.openProductModal(title, desc, canvas, pdfPath);
            }
        });
    });
    const productModalOverlay = document.getElementById('productModal');
    const productModal = productModalOverlay ? productModalOverlay.querySelector('.product-modal') : null;
    
    // Pre-fill service from URL query parameter (for Request a Quote flow)
    const serviceSelect = document.getElementById('service');
    const messageTextarea = document.getElementById('message');
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    const detailsParam = urlParams.get('details');
    
    if (serviceSelect && serviceParam) {
        let found = false;
        for (let i = 0; i < serviceSelect.options.length; i++) {
            if (serviceSelect.options[i].value.toLowerCase() === serviceParam.toLowerCase() || 
                serviceSelect.options[i].textContent.toLowerCase().includes(serviceParam.toLowerCase())) {
                serviceSelect.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (!found) {
            const packagingList = ['paper bags', 'gift boxes', 'packaging boxes', 'hang tags', 'shipping boxes'];
            if (packagingList.includes(serviceParam.toLowerCase())) {
                serviceSelect.value = "Packaging";
            } else {
                serviceSelect.value = "Other";
            }
        }
    }
    
    if (messageTextarea && detailsParam) {
        messageTextarea.value = detailsParam;
    }
    
    if(!productModalOverlay || !productModal) return;
    
    const productCards = document.querySelectorAll('.product-card');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalMainCanvas = document.getElementById('modalMainCanvas');
    const optionsContainer = document.getElementById('modalOptionsContainer');
    const submitBtn = document.getElementById('modalSubmitBtn');
    
    window.openProductModal = function(title, desc, sourceCanvas, pdfPath) {
        if (modalTitle) modalTitle.textContent = title;
        
        const mappedKey = getCompetitorKey(title);
        const pData = PRODUCT_DATA[mappedKey] || {
            basePrice: 10.00,
            desc: desc || 'Premium quality print material.',
            requiresQuote: true,
            options: {
                "Size": { "Standard": 0 },
                "Quantity": { "100 units": 0 }
            }
        };
        
        if (modalDesc) modalDesc.textContent = pData.desc;
        
        // Dynamically build the options selects
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            const isLookupProduct = (mappedKey === 'NCR Forms' || mappedKey === 'Brochures' || mappedKey === 'Booklets' || mappedKey === 'Flyers' || mappedKey === 'Posters' || mappedKey === 'Letterhead' || mappedKey === 'Presentation Folders');
            for (const [optionName, optionValues] of Object.entries(pData.options)) {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.textContent = optionName.toUpperCase();
                formGroup.appendChild(label);
                
                const select = document.createElement('select');
                select.className = 'modal-option-select';
                select.dataset.optionName = optionName;
                select.style.width = '100%';
                select.style.padding = '1rem';
                select.style.background = 'var(--black-soft)';
                select.style.border = '1px solid rgba(255,255,255,0.1)';
                select.style.borderRadius = '4px';
                select.style.color = 'var(--white)';
                select.style.fontFamily = 'var(--font-sans)';
                select.style.outline = 'none';
                select.style.transition = 'border-color 0.3s ease';
                select.addEventListener('change', window.updatePrice);
                
                for (const [valName] of Object.entries(optionValues)) {
                    const opt = document.createElement('option');
                    opt.value = valName;
                    opt.textContent = valName;
                    select.appendChild(opt);
                }
                
                formGroup.appendChild(select);
                optionsContainer.appendChild(formGroup);
            }
        }
        
        // Add Upload Design input
        const uploadGroup = document.createElement('div');
        uploadGroup.className = 'modal-option-group';
        uploadGroup.style.marginBottom = '1.5rem';
        
        const uploadLabel = document.createElement('label');
        uploadLabel.textContent = 'Upload Artwork / Design (Optional)';
        uploadLabel.style.display = 'block';
        uploadLabel.style.fontFamily = 'var(--font-serif)';
        uploadLabel.style.fontSize = '1.1rem';
        uploadLabel.style.color = 'var(--gold)';
        uploadLabel.style.marginBottom = '0.5rem';
        
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.id = 'modal_design_file';
        uploadInput.accept = 'image/*,.pdf,.ai,.psd';
        uploadInput.style.width = '100%';
        uploadInput.style.padding = '1rem';
        uploadInput.style.background = 'var(--black-soft)';
        uploadInput.style.border = '1px solid rgba(255,255,255,0.1)';
        uploadInput.style.borderRadius = '4px';
        uploadInput.style.color = 'var(--white)';
        uploadInput.style.fontFamily = 'var(--font-sans)';
        
        const previewContainer = document.createElement('div');
        previewContainer.id = 'modal_design_preview_container';
        previewContainer.style.marginTop = '1rem';
        previewContainer.style.display = 'none';
        
        const previewImg = document.createElement('img');
        previewImg.id = 'modal_design_preview';
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '200px';
        previewImg.style.borderRadius = '4px';
        previewImg.style.border = '1px solid rgba(255,255,255,0.1)';
        
        previewContainer.appendChild(previewImg);
        
        uploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const MAX_SIZE = 5 * 1024 * 1024;
                if (file.size > MAX_SIZE) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('File size exceeds 5MB limit. Please select a smaller file.', 'error');
                    } else {
                        alert('File size exceeds 5MB limit. Please select a smaller file.');
                    }
                    uploadInput.value = '';
                    previewContainer.style.display = 'none';
                    return;
                }

                if (file.type.startsWith('image/')) {
                    previewImg.src = URL.createObjectURL(file);
                    previewContainer.style.display = 'block';
                } else {
                    previewContainer.style.display = 'none';
                    if (typeof window.showToast === 'function') {
                        window.showToast(`Selected file: ${file.name}`, 'info');
                    }
                }
            } else {
                previewContainer.style.display = 'none';
            }
        });
        
        uploadGroup.appendChild(uploadLabel);
        uploadGroup.appendChild(uploadInput);
        uploadGroup.appendChild(previewContainer);
        optionsContainer.appendChild(uploadGroup);

        // Configure Action Button (Direct Inquiry / Add to Order Request)
        if (submitBtn) {
            submitBtn.style.display = 'flex';
            submitBtn.textContent = 'Add to Order Request →';
            submitBtn.onclick = async function(e) {
                e.preventDefault();
                
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Adding...';
                submitBtn.disabled = true;

                try {
                    const options = [];
                    const selects = optionsContainer.querySelectorAll('select.modal-option-select');
                    selects.forEach(select => {
                        const label = select.previousElementSibling.textContent;
                        const val = select.options[select.selectedIndex].textContent;
                        options.push({label, value: val});
                    });
                    
                    let uploadedDesign = null;
                    const fileInput = document.getElementById('modal_design_file');
                    if (fileInput && fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];
                        const MAX_SIZE = 5 * 1024 * 1024;
                        if (file.size > MAX_SIZE) {
                            window.showToast('File size exceeds 5MB limit.', 'error');
                            submitBtn.textContent = originalBtnText;
                            submitBtn.disabled = false;
                            return;
                        }

                        try {
                            const formData = new FormData();
                            formData.append('design_file', file);
                            
                            const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                                ? 'http://localhost:3000' 
                                : (window.location.origin.includes('vercel.app') ? window.location.origin : 'https://apex-printing.vercel.app');

                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 4000);

                            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                                method: 'POST',
                                body: formData,
                                signal: controller.signal
                            });
                            clearTimeout(timeoutId);
                            
                            if (uploadRes.ok) {
                                const uploadData = await uploadRes.json();
                                if (uploadData.success) {
                                    uploadedDesign = {
                                        url: `${API_BASE_URL}${uploadData.filePath}`,
                                        name: uploadData.fileName
                                    };
                                }
                            }
                        } catch (uploadErr) {
                            console.warn('Upload API unreachable, using local file object URL:', uploadErr);
                        }

                        if (!uploadedDesign) {
                            uploadedDesign = {
                                url: URL.createObjectURL(file),
                                name: file.name
                            };
                        }
                    }

                    if (typeof window.addToCart === 'function') {
                        window.addToCart({
                            title: title,
                            options: options,
                            design: uploadedDesign
                        });
                        window.showToast(`Added ${title} to your order request!`, 'success');
                        window.closeProductModal();
                    } else {
                        window.showToast('Cart system not loaded completely.', 'error');
                    }
                } catch (err) {
                    window.showToast(`Error adding item: ${err.message || err}`, 'error');
                } finally {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            };
        }
        
        window.currentProductPricing = {
            basePrice: pData.basePrice
        };
        
        // Copy canvas content or image source if available as initial main image
        if (modalMainCanvas) {
            const destCtx = modalMainCanvas.getContext('2d');
            if (sourceCanvas && sourceCanvas.getContext) {
                modalMainCanvas.width = sourceCanvas.width;
                modalMainCanvas.height = sourceCanvas.height;
                destCtx.drawImage(sourceCanvas, 0, 0);
            } else if (typeof sourceCanvas === 'string' || (sourceCanvas && sourceCanvas.tagName === 'IMG')) {
                const imgUrl = typeof sourceCanvas === 'string' ? sourceCanvas : sourceCanvas.src;
                const img = new Image();
                img.onload = function() {
                    modalMainCanvas.width = img.naturalWidth || 600;
                    modalMainCanvas.height = img.naturalHeight || 600;
                    destCtx.drawImage(img, 0, 0);
                };
                img.src = imgUrl;
            }
        }
        if (modalMainCanvas && pdfPath) {
            modalMainCanvas.setAttribute('data-pdf-path', pdfPath);
        }
        
        // Load page-by-page gallery thumbnails
        loadPDFGallery(pdfPath, sourceCanvas);
        
        window.updatePrice();
        
        if (productModalOverlay && productModal) {
            productModalOverlay.classList.add('active');
            productModal.classList.add('active');
            window.lockBodyScroll();
        }
    };

    productCards.forEach(card => {
        card.style.cursor = 'pointer';
        
        card.addEventListener('click', (e) => {
            e.preventDefault();
            
            const title = card.querySelector('h4')?.textContent || 'Product';
            const desc = card.querySelector('p')?.textContent || '';
            const canvas = card.querySelector('canvas.pdf-preview');
            const pdfPath = canvas ? canvas.getAttribute('data-pdf') : null;
            
            window.openProductModal(title, desc, canvas, pdfPath);
        });
    });

    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', (e) => {
            if (e.target === productModalOverlay) window.closeProductModal();
        });
    }
});

// --- TOAST NOTIFICATIONS ---
window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.apex-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'apex-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `apex-toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span style="font-weight:bold;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('active');
    });
    
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
};

// --- CART SYSTEM ---
let cart = JSON.parse(localStorage.getItem('apex_cart') || '[]');

function saveCart() {
    try {
        localStorage.setItem('apex_cart', JSON.stringify(cart));
    } catch (err) {
        console.warn('Could not save cart to localStorage:', err);
        if (typeof window.showToast === 'function') {
            window.showToast('Cart saved in session (storage full)', 'info');
        }
    }
    updateCartCount();
}

function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
        const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        countEl.textContent = `(${total})`;
    }
}

// Ensure it's called on load
document.addEventListener('DOMContentLoaded', updateCartCount);

window.addToCart = function(item) {
    const existingItem = cart.find(i => 
        i.title === item.title && 
        JSON.stringify(i.options) === JSON.stringify(item.options) &&
        JSON.stringify(i.design) === JSON.stringify(item.design)
    );
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        item.quantity = 1;
        cart.push(item);
    }
    saveCart();
};

window.openCartModal = function() {
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) {
        renderCartItems();
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeCartModal = function() {
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) {
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

function renderCartItems() {
    const cartContainer = document.getElementById('cartItemsList');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!cartContainer) return;
    
    cartContainer.innerHTML = '';
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="color:var(--gray);text-align:center;padding:2rem;">Your cart is empty.</p>';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    cart.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.style.padding = '1rem';
        itemEl.style.background = 'rgba(255,255,255,0.02)';
        itemEl.style.border = '1px solid rgba(255,255,255,0.05)';
        itemEl.style.borderRadius = '8px';
        itemEl.style.marginBottom = '1rem';
        itemEl.style.position = 'relative';
        
        let detailsHtml = '';
        if (item.options) {
            item.options.forEach(opt => {
                detailsHtml += `<div style="font-size:0.85rem;color:var(--gray);"><strong style="color:var(--white-soft);">${opt.label}:</strong> ${opt.value}</div>`;
            });
        }
        if (item.design) {
            detailsHtml += `<div style="font-size:0.85rem;color:var(--gold);margin-top:0.5rem;"><strong style="color:var(--white-soft);">Artwork:</strong> <a href="${item.design.url}" target="_blank" style="color:var(--gold);text-decoration:underline;">${item.design.name}</a></div>`;
        }
        
        itemEl.innerHTML = `
            <div style="font-family:var(--font-serif);color:var(--gold);font-size:1.1rem;margin-bottom:0.5rem;">${item.quantity && item.quantity > 1 ? item.quantity + 'x ' : ''}${item.title}</div>
            ${detailsHtml}
            <div style="margin-top:0.75rem;display:flex;align-items:center;gap:1rem;">
                <button onclick="updateQuantity(${index}, -1)" style="background:var(--gold);color:#000;border:none;border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;font-weight:bold;">-</button>
                <span style="font-size:0.95rem;color:var(--white);">${item.quantity || 1}</span>
                <button onclick="updateQuantity(${index}, 1)" style="background:var(--gold);color:#000;border:none;border-radius:4px;padding:0.2rem 0.6rem;cursor:pointer;font-weight:bold;">+</button>
            </div>
            <button onclick="removeFromCart(${index})" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1.2rem;" title="Remove Item">&times;</button>
        `;
        cartContainer.appendChild(itemEl);
    });
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartItems();
};

window.updateQuantity = function(index, change) {
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
        renderCartItems();
    }
};

window.checkoutCart = function() {
    if (cart.length === 0) return;
    let details = 'Hello, I would like to place an order request for the following items:\n\n';
    
    cart.forEach((item, i) => {
        const qty = item.quantity || 1;
        details += `--- ITEM ${i+1}: ${qty}x ${item.title} ---\n`;
        if (item.options) {
            item.options.forEach(opt => {
                details += `- ${opt.label}: ${opt.value}\n`;
            });
        }
        if (item.design) {
            details += `- Uploaded Artwork: ${item.design.name} (${item.design.url})\n`;
        }
        details += '\n';
    });
    
    details += 'Please review my specifications and contact me with the final quote and proof.';
    
    const targetUrl = `contact.html?service=Custom%20Order&details=${encodeURIComponent(details)}`;
    window.location.href = targetUrl;
};

// Create Cart HTML structure on load
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.className = 'modal-backdrop';
    
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:500px; right: 0; position: absolute; margin: 0; height: 100%; max-height: 100%; border-radius: 0; padding: 2rem; overflow-y: auto;">
            <button class="modal-close" onclick="closeCartModal()" style="font-size:2rem;color:var(--white);">&times;</button>
            <h2 style="font-family:var(--font-serif);color:var(--gold);margin-bottom:2rem;font-size:1.75rem;">Your Order Request</h2>
            <div id="cartItemsList"></div>
            <button id="cartCheckoutBtn" class="btn btn-primary" style="width:100%;margin-top:2rem;display:none;justify-content:center;" onclick="checkoutCart()">Submit Order Request &rarr;</button>
        </div>
    `;
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) window.closeCartModal();
    });
    
    document.body.appendChild(overlay);
    updateCartCount();
    
    // Initialize 3D Curved Cylinder Carousel if present
    init3DCurvedCarousel();
});

// --- 3D CONCAVE CYLINDRICAL PRODUCT CAROUSEL ENGINE ---
function init3DCurvedCarousel() {
    const viewport = document.getElementById('cylinderCarouselViewport');
    const track = document.getElementById('cylinderCarouselTrack');
    if (!viewport || !track) return;

    const cards = track.querySelectorAll('.cylinder-card');
    const numCards = cards.length;
    if (numCards === 0) return;

    let currentRotation = 0;
    let targetRotation = 0;
    let velocity = 0;
    const friction = 0.94;
    const lerpFactor = 0.12;
    const dragSensitivity = 0.16;
    const idleSpeed = 0.03;

    let isDragging = false;
    let isHovered = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let dragDistance = 0;
    let radius = 850;
    let cardWidth = 230;

    // Card click handlers for opening product customization & inquiry modal
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (dragDistance > 6) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const title = card.querySelector('.cylinder-card-title')?.textContent.trim() || 'Product';
            const subtitle = card.querySelector('.cylinder-card-subtitle')?.textContent.trim() || '';
            const img = card.querySelector('img');
            const imgSrc = img ? img.src : null;
            
            if (typeof window.openProductModal === 'function') {
                window.openProductModal(title, subtitle, imgSrc, null);
            }
        });
    });

    function updateDimensions() {
        const vw = window.innerWidth;
        if (vw <= 576) {
            radius = 460;
            cardWidth = 160;
        } else if (vw <= 992) {
            radius = 650;
            cardWidth = 190;
        } else {
            radius = 850;
            cardWidth = 230;
        }
    }

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Direct Concave Render Function
    function renderConcave() {
        const stepAngle = 360 / numCards; // 22.5 degrees per card (16 cards total)

        cards.forEach((card, index) => {
            const baseAngle = stepAngle * index;
            const rawAngle = baseAngle + currentRotation;
            // Normalize relative angle to [-180, 180]
            const relAngle = ((rawAngle % 360) + 540) % 360 - 180;
            const rad = relAngle * (Math.PI / 180);

            // Concave cylindrical mathematics (Inward amphitheater arc):
            // Center is X=0, Z=0. Sides recede in negative Z and rotate inward toward center
            const X = radius * Math.sin(rad);
            const Z = -radius * (1 - Math.cos(rad)) * 1.05;
            const rotY = -relAngle * 0.85; // Inward facing tilt
            const scale = Math.max(0.72, 1.0 - (1 - Math.cos(rad)) * 0.22);

            // Smooth opacity falloff for seamless circular culling
            const absAngle = Math.abs(relAngle);
            let opacity = 1.0;
            if (absAngle > 58) {
                opacity = Math.max(0, 1.0 - (absAngle - 58) / 22);
            }

            const zIndex = Math.round(1000 * Math.cos(rad));

            card.style.transform = `translate3d(${X.toFixed(1)}px, 0, ${Z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
            card.style.zIndex = zIndex;
            card.style.opacity = opacity.toFixed(3);
            card.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
        });
    }

    // Pointer Events (Mouse & Touch drag)
    viewport.addEventListener('pointerdown', (e) => {
        isDragging = true;
        dragDistance = 0;
        viewport.classList.add('is-dragging');
        startX = e.clientX;
        startY = e.clientY;
        lastX = e.clientX;
        lastTime = performance.now();
        velocity = 0;
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const now = performance.now();
        const deltaX = e.clientX - lastX;
        const dt = Math.max(now - lastTime, 8);

        dragDistance += Math.abs(deltaX);

        targetRotation += deltaX * dragSensitivity;
        velocity = (deltaX / dt) * 12;

        lastX = e.clientX;
        lastTime = now;
    });

    const stopDragging = () => {
        if (!isDragging) return;
        isDragging = false;
        viewport.classList.remove('is-dragging');
        setTimeout(() => { dragDistance = 0; }, 50);
    };

    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    // Mouse Wheel / Trackpad horizontal scroll support
    viewport.addEventListener('wheel', (e) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY * 0.4;
        if (Math.abs(delta) > 2) {
            targetRotation -= delta * 0.12;
            velocity = -delta * 0.06;
            e.preventDefault();
        }
    }, { passive: false });

    // Hover state to pause idle drift
    viewport.addEventListener('mouseenter', () => { isHovered = true; });
    viewport.addEventListener('mouseleave', () => { isHovered = false; });

    // 60-120fps Animation Loop
    function renderLoop() {
        if (!isDragging) {
            if (Math.abs(velocity) > 0.005) {
                targetRotation += velocity;
                velocity *= friction;
            } else {
                velocity = 0;
                if (!isHovered) {
                    targetRotation -= idleSpeed;
                }
            }
        }

        // Smooth Lerp
        currentRotation += (targetRotation - currentRotation) * lerpFactor;

        renderConcave();

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
}
