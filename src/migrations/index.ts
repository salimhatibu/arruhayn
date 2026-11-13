import * as migration_20261108_001643_initial from './20261108_001643_initial';
import * as migration_20261108_001700_search_index from './20261108_001700_search_index';
import * as migration_20261108_064756_fatwa_credits from './20261108_064756_fatwa_credits';
import * as migration_20261108_092718_staff_passwords from './20261108_092718_staff_passwords';

export const migrations = [
  {
    up: migration_20261108_001643_initial.up,
    down: migration_20261108_001643_initial.down,
    name: '20261108_001643_initial',
  },
  {
    up: migration_20261108_001700_search_index.up,
    down: migration_20261108_001700_search_index.down,
    name: '20261108_001700_search_index',
  },
  {
    up: migration_20261108_064756_fatwa_credits.up,
    down: migration_20261108_064756_fatwa_credits.down,
    name: '20261108_064756_fatwa_credits',
  },
  {
    up: migration_20261108_092718_staff_passwords.up,
    down: migration_20261108_092718_staff_passwords.down,
    name: '20261108_092718_staff_passwords'
  },
];
