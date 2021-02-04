<template>
  <div class="text-center">Waves Node Binary Protocol Listener</div>
  <div class="text-center text-xs text-gray-400">Can be used via Web Console (Ctrl+Shift+K)</div>
  <div class="grid grid-cols-1 lg:grid-cols-5 md:grid-cols-6 gap-6 items-end mt-4">
    <label class="block md:col-span-3 lg:col-span-1">
      <span>Host</span>
      <input v-model="host" type="text"
        class="border block w-full h-10 border-gray-400 focus:border-gray-800 focus:ring-0">
    </label>
    <label class="block md:col-span-3 lg:col-span-1">
      <span>Port</span>
      <input v-model="port" type="text"
        class="border block w-full h-10 border-gray-400 focus:border-gray-800 focus:ring-0">
    </label>
    <button :disabled="connected" @click="nodeConnect"
      class="border h-10 border-gray-400 hover:border-gray-800 focus:outline-none disabled:opacity-50 disabled:pointer-events-none md:col-span-2 lg:col-span-1">
      Connect
    </button>
    <button :disabled="!connected" @click="nodeDisconnect"
      class="border h-10 border-gray-400 hover:border-gray-800 focus:outline-none disabled:opacity-50 disabled:pointer-events-none md:col-span-2 lg:col-span-1">
      Disconnect
    </button>
    <button @click="clearMessages"
      class="border h-10 border-gray-400 hover:border-gray-800 focus:outline-none md:col-span-2 lg:col-span-1">
      Clear
    </button>
    <div id="logs" class="lg:col-span-5 md:col-span-6 h-96 overflow-scroll border border-gray-400 text-xs font-mono">
      <pre v-for="message in messages" :key="message.time">{{ message.time }}: {{ message.text }}</pre>
    </div>
  </div>
</template>

<script>
import client from 'socket.io-client'
import { ref, watch } from 'vue'

export default {
  name: 'Listen',
  setup() {
    const welcome = () => {
      console.info('%cWelcome to the Waves Node Binary Protocol Listener!', 'color:yellow')
      console.info(`%cUsage:%c
connect('host:port') - connect to the specified node
disconnect() - close connection
clear() - clear logs
help() - display this message
`, 'color:white', '')
    }
    welcome()
    const host = ref('35.158.218.156')
    const port = ref('6868')
    const connected = ref(false)
    const messages = ref([])
    let io
    const nodeConnect = () => io.emit('node-connect', `${host.value}:${port.value}`)
    const nodeDisconnect = () => io.emit('node-disconnect')
    const clearMessages = () => {
      messages.value.length = 0
      console.clear()
      welcome()
    }

    io = client(process.env.VUE_APP_SERVER)

    io.on('handshake', data => {
      connected.value = true
      console.info(data)
      messages.value.push({ time: new Date().toISOString(), text: data })
      console.group('messages')
    })

    io.on('message', data => {
      console.log(data)
      messages.value.push({ time: new Date().toISOString(), text: data })
    })

    io.on('closed', data => {
      connected.value = false
      console.groupEnd()
      console.warn(data)
      messages.value.push({ time: new Date().toISOString(), text: data })
    })

    window.connect = (data) => {
      io.emit('node-connect', data)
    }

    window.disconnect = () => {
      io.emit('node-disconnect')
    }

    window.help = welcome

    window.clear = clearMessages

    watch(() => messages.value.length, () => {
        const logsBlock = document.getElementById('logs')
        logsBlock.scrollTop = logsBlock.scrollHeight
      },
      {
        flush: 'post',
      })

    return {
      nodeConnect,
      nodeDisconnect,
      clearMessages,
      host,
      port,
      connected,
      messages,
    }
  },
}
</script>
