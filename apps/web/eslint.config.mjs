import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import accessibility from 'eslint-plugin-jsx-a11y';
const globals = Object.fromEntries(['window','document','self','navigator','URL','Blob','File','Image','Worker','OffscreenCanvas','createImageBitmap','AbortController','DOMException','performance','setTimeout','clearTimeout','requestAnimationFrame','console','process','Buffer'].map(name => [name, 'readonly']));
export default tseslint.config(
  { ignores: ['.next/**','out/**','next-env.d.ts','playwright-report/**','test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals }, plugins: { 'react-hooks': hooks, 'jsx-a11y': accessibility }, rules: { ...hooks.configs.recommended.rules, ...accessibility.configs.recommended.rules } },
);
