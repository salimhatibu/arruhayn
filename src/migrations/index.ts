import * as migration_20261108_001643_initial from './20261108_001643_initial';
import * as migration_20261108_001700_search_index from './20261108_001700_search_index';

export const migrations = [
  {
    up: migration_20261108_001643_initial.up,
    down: migration_20261108_001643_initial.down,
    name: '20261108_001643_initial'
  },
  {
    up: migration_20261108_001700_search_index.up,
    down: migration_20261108_001700_search_index.down,
    name: '20261108_001700_search_index'
  },
];
