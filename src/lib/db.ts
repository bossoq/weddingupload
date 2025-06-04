import Dexie, { type EntityTable } from 'dexie';

export const db = new Dexie('mookkornwedding') as Dexie & {
  photos: EntityTable<photos>;
};
db.version(4).stores({
  photos: '++id, name'
});
