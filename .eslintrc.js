module.exports = {
  "env": {
    "node": true,
    "commonjs": true,
    "es6": true,
  },
  "extends": "airbnb-base",
  "rules": {
    // Generic Linting Rules
    "no-unused-vars": ["error", { "args": "none" }],
    "object-shorthand": ["error", "consistent-as-needed"],
    "func-names": ["error", "as-needed"],
    "max-len": ["error", 180, 2, { ignoreComments: true }],
    "no-plusplus": "off",
    "consistent-return": "off",
    "no-underscore-dangle": "off",
    "camelcase": "off",
    "no-param-reassign": "off",
    "arrow-body-style": "off",
    "prefer-template": "off",
    "arrow-parens": "off",
    "global-require": "off",
    "comma-dangle": ["error", {
      "arrays": "always-multiline",
      "objects": "always-multiline",
      "imports": "always-multiline",
      "exports": "always-multiline",
      "functions": "ignore"
    }],
    "key-spacing": ["error", {
      "align": {
        "beforeColon": true,
        "afterColon": true,
        "on": "colon",
        "mode": "strict"
      }
    }],
    // ES6 Linting Rules
    "import/no-dynamic-require": "off",
    "import/newline-after-import": "off",
  }
};
