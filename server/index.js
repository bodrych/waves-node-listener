import net from 'net'
import { Server } from 'socket.io'
import { contentId, contentIdNames, Handshake, Message, Peers } from 'waves-proto-js'
import { inspect } from 'util'

const io = new Server(process.env.PORT, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
})

io.on('connect', socket => {
  let client
  socket.send('Hello!')
  socket.on('node-connect', data => {
    const [host, port] = data.split(':')
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
      socket.send(inspect(Handshake.fromBuffer(data)))

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
      socket.send(`Error: ${error}`)
    })

    client.on('timeout', () => {
      client.destroy(new Error('timeout'))
      socket.send('timeout')
    })

    client.on('close', () => {
      socket.send('closed')
    })
  })

  socket.on('disconnect', (reason) => {
    client && client.destroy()
  })

  socket.on('node-disconnect', (reason) => {
    client && client.destroy()
  })
})
