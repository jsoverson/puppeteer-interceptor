const handler = require('serve-handler');
const { createServer } = require('http');
const path = require('path');

const server = createServer((request, response) => {
  return handler(request, response, {
    public: path.join(__dirname, 'server_root'),
  });
});

exports.start = function(port, cb) {
  server.listen(port, cb);
};
exports.stop = function(cb) {
  server.close(cb);
};
