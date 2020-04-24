import handler from 'serve-handler';
import { createServer } from 'http';
import path from 'path';

const server = createServer((request, response) => {
  return handler(request, response, {
    public: path.join(__dirname, 'server_root'),
  });
});

export function start(port: number, cb: any) {
  server.listen(port, cb);
}

export function stop(cb: any) {
  server.close(cb);
}
