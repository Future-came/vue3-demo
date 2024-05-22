import { h, inject, toRefs, defineComponent } from 'vue'
import { useCommonEvents } from '../mixins/useCommonEvents'

export default defineComponent(
  {
    setup() {
      const allAttrs = inject('allAttrs')
      console.log(allAttrs)

      useCommonEvents(allAttrs)

      const node = (
        <div>
          this is page c
        </div>
      )
      return () => node
    }
  }
)