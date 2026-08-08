// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.aryasanatakademisi.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => !page.includes('/admin')
  })],
  redirects: {
    '/kurslar/piyano': '/piyano-kursu-kayseri',
    '/kurslar/gitar': '/gitar-kursu-kayseri',
    '/kurslar/keman': '/keman-kursu-kayseri',
    '/kurslar/bateri': '/bateri-kursu-kayseri',
    '/kurslar/baglama': '/baglama-kursu-kayseri',
    '/kurslar/san-solfej': '/san-dersi-kayseri',
    '/kurslar/resim-dersleri': '/resim-kursu-kayseri',
    '/kurslar/bilsem-hazirlik': '/bilsem-hazirlik-kayseri',
    '/kurslar/guzel-sanatlara-hazirlik': '/guzel-sanatlar-lisesi-hazirlik-kayseri',
    '/kurslar/cello': '/cello-kursu-kayseri',
    '/kurslar/kanun': '/kanun-kursu-kayseri',
    '/kurslar/klarnet': '/klarnet-kursu-kayseri',
    '/kurslar/ney': '/ney-kursu-kayseri',
    '/kurslar/saksafon': '/saksafon-kursu-kayseri',
    '/kurslar/trompet': '/trompet-kursu-kayseri',
    '/kurslar/ud': '/ud-kursu-kayseri',
    '/kurslar/ukulele': '/ukulele-kursu-kayseri',
    '/kurslar/yan-flut': '/yan-flut-kursu-kayseri'
  },
  adapter: vercel({
    webAnalytics: { enabled: false }
  }),
});
