// CJS extension required — package.json sets "type": "module" (same reason as .eslintrc.cjs).
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [1, 'always', 200],
  },
};
