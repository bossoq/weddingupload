import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'en';

register('en', () => import('./locales/en.json'));
register('th', () => import('./locales/th.json'));

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? navigator.language : defaultLocale
});
