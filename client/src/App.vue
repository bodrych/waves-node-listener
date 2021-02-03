<template>
  <div class="font-serif m-10">
    <Listen />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'App',
  components: {
    Listen: defineAsyncComponent(() => import('./components/Listen.vue')),
  }
}
</script>
