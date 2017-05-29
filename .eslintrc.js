module.exports = {
  "root": true,
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true
  },
  "extends": "airbnb-base",
  "plugins": ["import"],
  "rules": {
    "no-unused-vars": [
      "error", {
        "args": "none"
      }
    ],
    "object-shorthand": [
      "error", "consistent-as-needed"
    ],
    "func-names": [
      "error", "as-needed"
    ],
    // "max-len": ["error", 120, 2, { ignoreComments: true }],
    "max-len": "off",
    "no-plusplus": "off",
    "consistent-return": "off",
    "no-underscore-dangle": "off",
    "camelcase": "off",
    "no-param-reassign": "off",
    "arrow-body-style": "off",
    "prefer-template": "off",
    "arrow-parens": "off",
    "global-require": "off",
    "comma-dangle": [
      "error", {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "ignore"
      }
    ],
    "key-spacing": [
      "error", {
        "align": {
          "beforeColon": true,
          "afterColon": true,
          "on": "colon",
          "mode": "strict"
        }
      }
    ],
    "import/no-dynamic-require": "off",
    "import/newline-after-import": "off"
  }
};
