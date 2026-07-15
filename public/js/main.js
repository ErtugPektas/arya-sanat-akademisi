/**
 * main.js — Arya Sanat Akademisi
 * Site genel etkileşimleri: sticky header, hamburger, scroll reveal,
 * form, mute butonu, back-to-top, footer yılı
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* -----------------------------------------------------------------------
     1. Sticky Header (scroll)
  ----------------------------------------------------------------------- */
  const header = document.getElementById('site-header');

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // İlk kontrol

  /* -----------------------------------------------------------------------
     2. Hamburger Menü
  ----------------------------------------------------------------------- */
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-cta');

  function toggleMenu(force) {
    const isOpen = (force !== undefined) ? force : !hamburger.classList.contains('active');
    hamburger.classList.toggle('active', isOpen);
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen.toString());
    mobileMenu.setAttribute('aria-hidden', (!isOpen).toString());
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => toggleMenu());

  // Menü linklerine tıklandığında kapat
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Dışarı tıklandığında kapat
  document.addEventListener('click', (e) => {
    if (
      mobileMenu.classList.contains('open') &&
      !mobileMenu.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      toggleMenu(false);
    }
  });

  // ESC ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      toggleMenu(false);
      hamburger.focus();
    }
  });

  /* -----------------------------------------------------------------------
     3. Smooth Scroll — Anchor linkler
  ----------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"], a[href^="../#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      const targetSelector = href.startsWith('../') ? href.substring(2) : href;
      const target = document.querySelector(targetSelector);
      
      if (target) {
        e.preventDefault();
        const navHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
        ) || 76;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* -----------------------------------------------------------------------
     4. Active Nav Link (scroll spy)
  ----------------------------------------------------------------------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const NAV_HEIGHT = 80;

  function updateActiveNav() {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - NAV_HEIGHT - 20) {
        current = sec.id;
      }
    });
    navLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${current}`;
      link.style.color = isActive ? 'var(--color-primary)' : '';
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });

  /* -----------------------------------------------------------------------
     5. Scroll Reveal — IntersectionObserver
  ----------------------------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  // Tek tek reveal elemanlar
  document.querySelectorAll('.section-header').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Stagger grids
  const staggerSelectors = [
    '.courses-grid',
    '.features-grid',
    '.teachers-grid',
  ];
  staggerSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      el.classList.add('stagger-children');
      revealObserver.observe(el);
    }
  });

  // İletişim bölümü
  document.querySelectorAll('.contact-info, .contact-form-wrapper').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  /* -----------------------------------------------------------------------
     6. Mute Butonu
  ----------------------------------------------------------------------- */
  const muteBtn       = document.getElementById('muteBtn');
  const soundOnIcon   = document.getElementById('soundOnIcon');
  const soundOffIcon  = document.getElementById('soundOffIcon');

  if (window.AudioManager && muteBtn) {
    const muted = AudioManager.getMuted();
    muteBtn.classList.toggle('muted', muted);
    soundOnIcon.style.display  = muted ? 'none' : 'block';
    soundOffIcon.style.display = muted ? 'block' : 'none';
    muteBtn.setAttribute('aria-label', muted ? 'Sesi aç' : 'Sesi kapat');
  }

  muteBtn.addEventListener('click', () => {
    // AudioManager'ı başlat (kullanıcı etkileşimi)
    if (window.AudioManager) {
      const muted = AudioManager.toggleMute();
      muteBtn.classList.toggle('muted', muted);
      soundOnIcon.style.display  = muted ? 'none' : 'block';
      soundOffIcon.style.display = muted ? 'block' : 'none';
      muteBtn.setAttribute('aria-label', muted ? 'Sesi aç' : 'Sesi kapat');

      // Sesli geri bildirim: kapatmıyorsak kısa bir nota çal
      if (!muted) {
        AudioManager.play('piano');
      }
    }
  });

  /* -----------------------------------------------------------------------
     7. Back to Top
  ----------------------------------------------------------------------- */
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTop.hidden = false;
      // CSS geçişi için bir tick bekle
      requestAnimationFrame(() => backToTop.removeAttribute('hidden'));
    } else {
      backToTop.hidden = true;
    }
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* -----------------------------------------------------------------------
     8. Footer — Otomatik Yıl
  ----------------------------------------------------------------------- */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* -----------------------------------------------------------------------
     9. İletişim Formu
  ----------------------------------------------------------------------- */
  const contactForm  = document.getElementById('contactForm');
  const formSuccess  = document.getElementById('formSuccess');
  const submitBtn    = document.getElementById('submitBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basit doğrulama
      const fullName   = document.getElementById('fullName').value.trim();
      const phone      = document.getElementById('phone').value.trim();
      const instrument = document.getElementById('instrument').value;

      if (!fullName || !phone || !instrument) {
        // Hatalı alanları vurgula
        [
          { id: 'fullName', val: fullName },
          { id: 'phone', val: phone },
          { id: 'instrument', val: instrument },
        ].forEach(({ id, val }) => {
          const input = document.getElementById(id);
          if (!val) {
            input.style.borderColor = '#ef4444';
            input.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
            setTimeout(() => {
              input.style.borderColor = '';
              input.style.boxShadow = '';
            }, 2500);
          }
        });
        return;
      }

      // Gönderim simülasyonu
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor...';

      setTimeout(() => {
        formSuccess.hidden = false;
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          Ücretsiz Ders Talep Et
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        `;
        setTimeout(() => { formSuccess.hidden = true; }, 5000);
      }, 1200);
    });

    // Input odaklandığında hata stilini kaldır
    contactForm.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('focus', () => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      });
    });
  }

  /* -----------------------------------------------------------------------
     10. Hero parallax (hafif) — sadece masaüstünde, mobilde kapalı
  ----------------------------------------------------------------------- */
  const heroImg = document.querySelector('.hero-img');
  const isTouchDevice = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  if (
    heroImg &&
    !isTouchDevice() &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroImg.style.transform = `translateY(${scrolled * 0.25}px)`;
      }
    }, { passive: true });
  }

  /* -----------------------------------------------------------------------
     11. WhatsApp buton görünümü
  ----------------------------------------------------------------------- */
  const whatsappFloat = document.getElementById('whatsappFloat');
  // 2 sn sonra ilk kez görünür yap (dikkat çekici giriş)
  if (whatsappFloat) {
    whatsappFloat.style.transform = 'scale(0) translateY(20px)';
    whatsappFloat.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      whatsappFloat.style.transform = '';
    }, 2000);
  }

});
