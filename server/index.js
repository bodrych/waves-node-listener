import net from 'net'
import { Server } from 'socket.io'
import { contentId, contentIdNames, Handshake, Message, Peers } from 'waves-proto-js'
import { inspect } from 'util'
import dotenv from 'dotenv'

dotenv.config()

const { PORT, ORIGIN } = process.env

console.log({ PORT, ORIGIN })

const io = new Server(PORT, {
  cors: {
    origin: ORIGIN,
    methods: ['GET', 'POST'],
  },
})

io.on('connect', socket => {
  let client
  socket.on('node-connect', data => {
    if (!data) {
      socket.send('Invalid host')
      return
    }
    const [host, port] = data.split(':')
    if (!host || !port) {
      socket.send('Invalid host')
      return
    }
    client = net.createConnection({ host, port })

    client.on('ready', () => {
      // say hello
      const handshake = new Handshake()
      client.write(handshake.toBuffer())

      // ask for known peers
      const getPeersMessage = new Message({ contentId: contentId.getPeers })
      client.write(getPeersMessage.toBuffer())
    })

    client.once('data', data => {
      socket.emit('handshake', inspect(Handshake.fromBuffer(data)))

      let buffer = Buffer.from([])
      let targetLength = 0

      client.on('data', data => {
        if (buffer.length === 0) targetLength = data.readInt32BE() + 4
        buffer = Buffer.concat([buffer, data])
        if (buffer.length < targetLength) return
        // try to unmarshal message
        const targetBuffer = buffer.slice(0, targetLength)
        buffer = buffer.slice(targetLength)
        if (buffer.length >= 4) targetLength = buffer.readInt32BE() + 4
        const message = Message.fromBuffer(targetBuffer)
        socket.send(`${contentIdNames[message.header.contentId]} ${targetBuffer.inspect()}`)
        switch (message.header.contentId) {
          // node asks for known peers
          case contentId.getPeers:
            // just reply with empty peers
            const peers = new Message({
              contentId: contentId.peers,
              payload: new Peers(),
            })
            client.write(peers.toBuffer())
            break
        }
      })
    })

    client.on('error', error => {
      socket.emit('closed', `Error: ${error}`)
    })

    client.on('timeout', () => {
      client.destroy(new Error('timeout'))
      socket.emit('closed', 'timeout')
    })

    client.on('close', () => {
      socket.emit('closed', 'Connection closed')
    })
  })

  socket.on('disconnect', (reason) => {
    client && client.destroy()
  })

  socket.on('node-disconnect', (reason) => {
    client && client.destroy()
  })
})

process.on('SIGTERM', () => {
  io.close(() => {
    process.exit(0)
  })
})
