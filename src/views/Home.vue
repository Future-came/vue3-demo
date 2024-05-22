<template>
  <div>
    this is home page
    <button @click="handleClick">go to pageA</button>
  </div>
</template>

<script setup>
  import { ref, reactive, toRefs, computed } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  function handleClick() {
    router.push('/pageA')
  }

</script>

<style scoped lang='less'>

</style>
