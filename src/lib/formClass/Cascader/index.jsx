import { defineComponent, h, inject, ref, toRefs, onMounted } from 'vue'

import { ElCascader } from 'element-plus'

export default {
  props: {
    uuid: String
  },
  setup(props, context) {
    const allAttrs = inject('allAttrs')

    const nodesManagement = inject('nodesManagement')

    const { uuid } = toRefs(props)

    const node = <ElCascader disabled={true}></ElCascader>
    
    return () => node
  }
}
