<!-- 组件栏 -->
<template>
  <teleport to="body">
    <div
      ref="shortcutWrapperRef"
      class="template-shortcut__wrapper"
    >
      <div
        ref="shortcutHeaderRef"
        class="template-shortcut__header pd-20 c-move"
      >
        <el-icon class="c-pointer" :size="20" @click="close"><Close /></el-icon>
      </div>
      <div class="template-shortcut__classes">
        <div
          v-for="(item, index) in COMPONENT_CLASSIFICATION"
          :class="[
            'shortcut-classes__item',
            activatedIndex === index
              ? 'shortcut-activated'
              : ''
          ]"
          :key="item.typeDesc"
          @click="() => activatedIndex = index"
        >
          <span class="shortcut-class__label">{{ item.typeDesc }}</span>
          <span class="shortcut-class__count">{{ item.children.length }}</span>
        </div>
      </div>
      <el-scrollbar
        class="template-shortcut__list pd-20"
        max-height="calc(100vh - 260px)"
      >
        <div
          class="shortcut-item"
          draggable="true"
          v-for="item in COMPONENT_CLASSIFICATION[activatedIndex].children"
          :key="item.type"
          @dragstart="(e) => handleDragStart(e, item.type)"
          @dragend="handleDragEnd"
        >{{ item.typeDesc }}</div>
        <span class="shortcut-items__count">-{{ COMPONENT_CLASSIFICATION[activatedIndex].children.length }}-</span>
      </el-scrollbar>
    </div>
  </teleport>
</template>

<script setup>
  import { ref, reactive, inject, watch, onMounted, onUnmounted } from 'vue'
  import { Close } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { shortcutTypes } from '../lib/index.js'
  import { useCommonEvents } from '../mixins/useCommonEvents.js'

  const allAttrs = inject('allAttrs')
  const emitter = inject('emitter')

  emitter && (
    emitter.on('update:componentsBarStatus', (status) => {
      if (location.status !== status) {
        location.status = status
        status === 'init' && initSelfPosition()
        updateSelfPosition()
      }
    }),
    emitter.on('resize:window', () => getOriginalPositionAndCover('windowResized'))
  )

  const eventTransmissionController = inject('eventTransmissionController')
  const UUID_SYMBOL = inject('UUID_SYMBOL')
  const redoLogs = inject('redoLogs')

  const router = useRouter()
  const { execBoth } = useCommonEvents(allAttrs)

  // 组件分类
  const COMPONENT_CLASSIFICATION = formatComponentClassList(shortcutTypes)

  function formatComponentClassList(shortcutTypes) {
    return Object.values(
      Array.from(shortcutTypes.keys()).reduce((res, key) => {
        const { description, type, typeDesc } = shortcutTypes.get(key)
        // 组件小类
        const subType = {
          type: key,
          typeDesc: description
        }
        if (!(type in res)) {
          Object.assign(
            res,
            {
              // 组件大类
              [type]: {
                type,
                typeDesc,
                // 组件小类列表
                children: [
                  subType
                ]
              }
            }
          )
          return res
        }
        res[type].children.push(subType)
        return res
      }, {})
    )
  }

  // 应用的主体部分位置
  const appContentLocation = reactive({
    top: 0,
    left: 0
  })

  // 组件栏位置信息
  const location = reactive({
    // 原始位置的top值
    originaltop: 0,
    // 原始位置的left值
    originalLeft: 0,
    // 变换位置后的top值
    top: 0,
    // 变换位置后的left值
    left: 0,
    status: 'unactivated'
  })

  // 拖拽的距离
  const transform = reactive({
    offsetX: 0,
    offsetY: 0,
  })

  const shortcutWrapperRef = ref()
  const shortcutHeaderRef = ref()
  const activatedIndex = ref(0)

  onMounted(() => {
    getOriginalPositionAndCover()
    //  TODO windowresize触发时检查是否需要更新位置
  })

  function close() {
    emitter.emit('update:componentsBtnStatus', 'unactivated')
    location.status = 'unactivated'
    updateSelfPosition()
  }

  // 加载组件,显示组件栏
  function initSelfPosition() {
    // 默认值为app-content容器的top和left
    const {
      top: appContentTop,
      // left: appContentLeft
    } = document.querySelector('body')
      .getBoundingClientRect()

    Object.assign(
      location,
      {
        ...Object.assign(
          appContentLocation,
          {
            top: appContentTop + 90,
            // left: appContentLeft + 40
            left: 0
          }
        )
      }
    )

  }

  // 获取原始位置并覆盖当前位置
  function getOriginalPositionAndCover(from) {

    // 获取工具栏组件按钮的位置及大小
    const {
      width,
      height,
      top,
      left
    } = document.querySelector('body')
      .getBoundingClientRect()

    const originaltop = top + height / 2
    const originalLeft = left + width / 2

    ;(
      !from ||
      (
        from &&
        location.status === 'unactivated'
      )
    ) && Object.assign(
      shortcutWrapperRef.value.style,
      {
        transform: `translate(${originalLeft}px, ${originaltop}px) scale(1)`,
      }
    )

    Object.assign(
      location,
      {
        originaltop,
        originalLeft
      }
    )
  }

  // 打开/关闭并重置组件栏位置
  function updateSelfPosition() {
    const activated = location.status !== 'unactivated'
    const x = [location.originalLeft, location.left][~~activated]
    const y = [location.originaltop, location.top][~~activated]
    Object.assign(
      shortcutWrapperRef.value.style,
      {
        opacity: ~~activated,
        transform: `translate(${x}px, ${y}px) scale(${~~activated})`,
      }
    )
  }

  function handleDragStart(e, nodeName) {
    execBoth()

    eventTransmissionController({
      // 操作类型 压缩事件
      type: 'compress'
    })

    redoLogs.value.push([])
    eventTransmissionController({
      // 操作类型
      type: 'update',
      // 同步数据到哪几个字段
      fields: ['draggingNodeInfo'],
      // 数据
      data: [
        {
          [UUID_SYMBOL]: 'flkselkg',
          nodeName,
        }
      ],
    })
  }

  function handleDragEnd(e) {
    redoLogs.value.at(-1).length === 0 && redoLogs.value.splice(-1, 1)
    eventTransmissionController({
      // 操作类型
      type: 'clear',
      // 同步数据到哪几个字段
      fields: ['draggingNodeInfo']
    })
  }

  defineExpose({})
</script>

<style scoped lang='less'>
  .template-shortcut__wrapper {
    display: grid;
    grid-template-columns: 100px 170px;
    grid-template-rows: 50px 1fr;
    position: fixed;
    width: 270px;
    height: calc(100vh - 260px);
    background-color: #f9f9fe;
    border-radius: 10px;
    border: 1px solid white;
    box-shadow: 12px 17px 51px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(6px);
    top: 0;
    left: 0;
    opacity: 0;
    transform: scale(0);
    transform-origin: 0 0;
    transition: all .3s ease-out;
    overflow: hidden;
    z-index: 4;
    .template-shortcut__header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 20px;
      grid-column: 1 / 3;
      background-color: #ffffff;
      border-bottom: 1px solid #eee;
    }
    .template-shortcut__classes {
      display: flex;
      flex-flow: column;
      background-color: #ffffff;
      .shortcut-classes__item {
        gap: 0;
        padding: 10px;
        width: 100%;
        background-color: #ffffff;
        transition: all .2s ease-out;
        user-select: none;
        cursor: pointer;
        overflow: hidden;
        .shortcut-class__label,
        .shortcut-class__count {
          user-select: none;
          transform: translateX(0);
          transition: transform .2s ease-in-out;
        }
      }
      .shortcut-classes__item:hover,
      .shortcut-classes__item.shortcut-activated {
        background-color: #f9f9fe;
      }
      .shortcut-classes__item.shortcut-activated {
        .shortcut-class__label {
          transform: translateX(calc(40px - 50%));
        }
        .shortcut-class__count {
          transform: translateX(30px);
        }
      }
    }
    .template-shortcut__list {
      .shortcut-item {
        user-select: none;
        cursor: pointer
      }
      .shortcut-items__count {
        top: unset;
        bottom: -10px;
        display: inline-block;
        user-select: none;
      }
    }
  }
</style>
