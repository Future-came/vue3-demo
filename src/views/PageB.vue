<script lang="jsx">
  import { ref, provide, inject, h } from 'vue'
  import { jsxModules } from '@/lib/index'

  export default {
    setup() {
      const { nodes, nodeMappings } = inject('templateData')
      provide('jsxModules', jsxModules)
      const templateNodes = ref([])
      nodeMappings.get('top').forEach(uuid => {
        const { nodeName } = nodes.get(uuid)
        templateNodes.value.push(
          h(
            jsxModules.get(nodeName),
            {
              uuid
            }
          )
        )
      })
      return () => templateNodes.value
    }
  }
</script>

<style scoped lang='less'>

</style>