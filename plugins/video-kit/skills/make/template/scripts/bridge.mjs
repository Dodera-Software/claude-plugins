// Runs on the computer (not in Docker) while render.sh captures: many dev servers (Vite on recent
// Node) listen only on the IPv6 loopback, ::1, which Docker can't reach; it reaches 127.0.0.1. For
// each port that answers on ::1 but not on 127.0.0.1, this listens on 127.0.0.1 and passes the
// connections through. render.sh starts it and stops it after the capture.
//
// Usage: node scripts/bridge.mjs <port> [port …]
import { connect, createServer } from 'node:net'

function answers(host, port) {
  return new Promise(resolve => {
    const socket = connect({ host, port })
    socket.setTimeout(1000)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
  })
}

for (const port of process.argv.slice(2).map(Number)) {
  if (await answers('127.0.0.1', port) || !(await answers('::1', port))) {
    continue
  }
  createServer(socket => {
    const upstream = connect({ host: '::1', port })
    socket.pipe(upstream).pipe(socket)
    socket.on('error', () => upstream.destroy())
    upstream.on('error', () => socket.destroy())
  }).listen(port, '127.0.0.1', () => console.log(`Passing 127.0.0.1:${port} through to [::1]:${port}`))
}
