import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const storage = browser ? JSON.parse(localStorage.getItem('prefs') || '{}') || {} : {};
const storeSettings = () => {
  if (browser) {
    localStorage.setItem('prefs', JSON.stringify(storage));
  }
};

export const name = writable<string>(storage.name || '');

name.subscribe((value) => {
  storage.name = value;
  storeSettings();
});
