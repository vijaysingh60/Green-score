import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import base from '../../eslint.base.mjs';

export default defineConfig([...base, reactHooks.configs.flat.recommended]);
