const assert = require('assert');
const core = require('core');

describe('core', () => {
  describe('#formatMessage', () => {
    it('should remove reply-message quote', (done) => {
      const messages = {
        headers: [{ name: 'In-Reference-To', value: 'blah-blah' }],
      };
    });
  });
});
