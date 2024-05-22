import { ref, onMounted, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export function useCommonEvents(allAttrs, uuid, customClassName, type, ) {

  const {
    eventTransmissionController,
    nodesSelectionManagement,
    draggingNodeManagement,
    nodeMappingsManagement,
    statusManagement,
    nodesManagement,
    UUID_SYMBOL,
    pressKeys,
    redoLogs,
    emitter
  } = allAttrs

  // 清空所有已选组件并清除状态
  function clearSelectionStatus() {
    if (nodesSelectionManagement.list().length) {
      // 点击非组件，则移除选中状态
      nodesSelectionManagement.list().forEach(item => {
        const nodeClassName = item.split(':')[1]
        const nodeEl = document.querySelector(`.${nodeClassName}`)
        nodeEl.style.outline = 'unset'
      })
      nodesSelectionManagement.clear()
    }
  }

  // 关闭组件的右键菜单
  function closeContextmenu() {
    emitter.emit('close:contextmenu')
  }

  function execBoth() {
    emitter.emit('getLocalConfBarStatus', {
      cb: localConfBarStatus => {
        localConfBarStatus === 'unactivated' && (
          clearSelectionStatus(),
          closeContextmenu()
        )
      }
    })
  }

  const onDragstart = e => {
    execBoth()
    e.stopPropagation()

    eventTransmissionController({
      // 操作类型 压缩事件
      type: 'compress'
    })

    // 新增一行日志
    redoLogs.value.push([])
    draggingNodeManagement.update(
      {
        [UUID_SYMBOL]: uuid.value,
        nodeName: nodesManagement.get(uuid.value, 'nodeName'),
        ...nodeMappingsManagement.get(uuid.value)
      }
    )
  }

  const onDragenter = e => {
    e.stopPropagation()

    // 拖拽元素是自身时，禁止操作
    const draggingNodeUUID = draggingNodeManagement.getFields('uuid')
    if (uuid.value === draggingNodeUUID) {
      eventTransmissionController({
        // 操作类型
        type: 'update',
        // 同步数据到哪几个字段
        fields: ['draggingNodeInfo'],
        // 数据
        data: [
          {
            isOnSelf: true
          }
        ],
      })
      return false
    }

    e.preventDefault()
  }

  const onDragover = e => {
    e.stopPropagation()

    // 拖拽元素是自身时，禁止操作
    const draggingNodeUUID = draggingNodeManagement.getFields('uuid')
    if (uuid.value === draggingNodeUUID) {
      return false
    }

    // 禁止将父元素拖入子元素
    if ((nodeMappingsManagement.getDirectChildren(draggingNodeUUID) || []).includes(uuid.value)) {
      return false
    }

    e.preventDefault()

    // 鼠标位置，left-top左侧和上侧边距区域、center中间区域、right-bottom右侧和下侧边距区域
    const mousePosition = 'center'

    // 获取父元素、父元素样式、父元素的布局
    const parentNode = e.target.parentNode
    const parentStyle = window.getComputedStyle(parentNode)
    const {
      display,
      flexFlow,
      gridAutoFlow
    } = parentStyle

    // 获取拖拽节点信息
    const {
      parentUUID: draggingNodeParentUUID,
      offset: draggingNodeOffset,
    } = draggingNodeManagement.getFields()

    // // 设置拖拽节点的下一个位置
    const nextPosition = {
      parentUUID: null,
      offset: null
    }
    if (mousePosition === 'center') {
      if (
        // 如果与当前组件与已放入的父节点uuid一致（即该组件已放置到父组件内），则执行预删除来判断是否重复放置，如果为重复放置，则不做处理
        // 避免eventTransmissionController中offset一直为1造成问题
        uuid.value === draggingNodeParentUUID
      ) {
        return false
      }
      Object.assign(
        nextPosition,
        {
          parentUUID: uuid.value,
          offset: nodeMappingsManagement.getDirectChildrenCount(uuid.value),
        }
      )
    } else if (mousePosition === 'right-bottom') {
      const {
        parentUUID: targetComponentParentUUID,
        offset: targetComponentOffset
      } = nodeMappingsManagement.get(uuid.value)
      if (
        // 判断组件是否已放置，如果已放置，则不处理以防止重复放置
        targetComponentOffset === draggingNodeOffset - 1 &&
        targetComponentParentUUID === draggingNodeParentUUID
      ) {
        return false
      }

      // 如果组件为新拖入，则位置加1
      let nextOffset = targetComponentOffset + 1

      if (
        // 如果组件从父组件拖动来切换位置，则互换位置
        nodeMappingsManagement.getDirectChildren(targetComponentParentUUID).includes(draggingNodeUUID) &&
        draggingNodeOffset < targetComponentOffset
      ) {
        nextOffset = targetComponentOffset
      }

      Object.assign(
        nextPosition,
        {
          parentUUID: targetComponentParentUUID,
          offset: nextOffset,
        }
      )
    } else {
      const {
        parentUUID: targetComponentParentUUID,
        offset: targetComponentOffset
      } = nodeMappingsManagement.get(uuid.value)
      if (
        // 判断组件是否已放置，如果已放置，则不处理以防止重复放置
        targetComponentOffset - 1 === draggingNodeOffset &&
        targetComponentParentUUID === draggingNodeParentUUID
      ) {
        return false
      }
      Object.assign(
        nextPosition,
        {
          parentUUID: targetComponentParentUUID,
          offset: targetComponentOffset,
        }
      )
    }


    // // 判断类型并调用事件传输控制器函数
    const type = nodesManagement.isExist(draggingNodeUUID) && 'update' || 'insert'
    const fields = ['draggingNodeInfo', 'nodes', 'nodeMappings']

    // update时nodes无需更新
    fields.splice(1, ~~(type === 'update'))

    const data = [
      {
        ...nextPosition,
        originalParentUUID: draggingNodeParentUUID,
        originalOffset: draggingNodeOffset
      }
    ]

    eventTransmissionController({
      // 操作类型
      type,
      // 同步数据到哪几个字段
      fields,
      // 数据
      data
    })
  }

  const onDragleave = e => {
    e.stopPropagation()

    // 拖拽元素是自身时，禁止操作
    const {
      uuid: draggingNodeUUID,
      isOnSelf
    } = draggingNodeManagement.getFields(['uuid', 'isOnSelf'])
    if (
      uuid.value === draggingNodeUUID &&
      isOnSelf
    ) {
      eventTransmissionController({
        // 操作类型
        type: 'update',
        // 同步数据到哪几个字段
        fields: ['draggingNodeInfo'],
        // 数据
        data: [
          {
            isOnSelf: false
          }
        ],
      })
      return false
    }

    e.preventDefault()
  }

  const onDragend = e => {
    e.stopPropagation()
    redoLogs.value.at(-1).length === 0 && redoLogs.value.splice(-1, 1)

    eventTransmissionController({
      // 操作类型
      type: 'clear',
      // 同步数据到哪几个字段
      fields: ['draggingNodeInfo']
    })
  }

  const onDrop = e => {
    e.stopPropagation()
    e.preventDefault()
  }

  const onClick = useDebounceFn(
    (e, customClassName) => {
      emitter.emit('getLocalConfBarStatus', {
        cb: localConfBarStatus => {
          if (localConfBarStatus === 'unactivated') {

            emitter.emit('close:contextmenu')
            // TODO 如果没有其他需求，移除nodeUniMark中的uuid
            const nodeUniMark = `${uuid.value}:${customClassName}`

            if (
              // click + ctrl事件实现组件多选
              pressKeys.value.size === 1 &&
              pressKeys.value.has('Control')
            ) {
              // 已选则剔除
              const currentNode = document.querySelector(`.${customClassName}`)

              const [
                operation,
                outlineVal
              ] = [
                ['add', '1px solid #41b883'],
                ['remove', 'unset']
              ][~~nodesSelectionManagement.includes(nodeUniMark)]

              nodesSelectionManagement[operation](nodeUniMark)
              currentNode.style.outline = outlineVal
            }

            // click事件实现单选
            if (pressKeys.value.size === 0) {
              // 有多个已选，剔除其他已选；仅当前已选，则剔除当前已选
              const selectionSize = nodesSelectionManagement.size()
              const selectionList = nodesSelectionManagement.list()

              // 是否需要修改选中状态
              const needChangeStatus = (
                (
                  !nodesSelectionManagement.includes(nodeUniMark) &&
                  selectionSize >= 1
                ) ||
                selectionSize === 0
              )

              // 是否需要修改条件
              const needChangeCondition = (
                nodesSelectionManagement.includes(nodeUniMark) &&
                selectionSize === 1
              )

              needChangeStatus && selectionList.push(nodeUniMark)

              selectionList.forEach(item => {
                const nodeClassName = item.split(':')[1]
                const nodeEl = document.querySelector(`.${nodeClassName}`)

                const [
                  operation,
                  outlineVal
                ] = [
                  ['remove', 'unset'],
                  ['add', '1px solid #41b883']
                ][~~(item === nodeUniMark) ^ ~~needChangeCondition]

                nodesSelectionManagement[operation](item)
                nodeEl.style.outline = outlineVal
              })
            }
          }
        }
      })
    },
    150
  )

  const onContextmenu = useDebounceFn(
    (e, customClassName) => {

      emitter.emit('getLocalConfBarStatus', {
        cb: localConfBarStatus => {
          if (localConfBarStatus === 'unactivated') {

            const nodeUniMark = `${uuid.value}:${customClassName}`

            if (!nodesSelectionManagement.includes(nodeUniMark)) {

              const selectionList = nodesSelectionManagement.list()
              selectionList.push(nodeUniMark)

              selectionList.forEach((item, index) => {
                // 如果右键的组件没有选中，则选中该组件，清空其他组件
                const nodeClassName = item.split(':')[1]
                const nodeEl = document.querySelector(`.${nodeClassName}`)
                const [
                  operation,
                  outlineVal
                ] = [
                  ['remove', 'unset'],
                  ['add', '1px solid #41b883']
                ][~~(index === selectionList.length - 1)]

                nodesSelectionManagement[operation](item)
                nodeEl.style.outline = outlineVal
              })
            }
            emitter.emit('update:position', {x: e.clientX, y: e.clientY})

          }
        }
      })
    },
    150
  )

  const nodeRefDom = ref(null)

  type && onMounted(() => {
    nodeRefDom.value = document.querySelector(`.${customClassName}`)

    type === 'form' && nodeRefDom.value.classList.add('form-el_disabled')

    // 组件配置时，禁止拖动操作
    statusManagement.getConfPageStatus() === 'unactivated' && nodeRefDom.value.setAttribute('draggable', true)

    nodeRefDom.value.dataset.isComponent = true

    for (var childNode of nodeRefDom.value.children) {
      !childNode.dataset.isComponent && (childNode.style.pointerEvents = 'none')
    }

    nodeRefDom.value.addEventListener('dragstart', onDragstart)
    nodeRefDom.value.addEventListener('dragenter', onDragenter)
    nodeRefDom.value.addEventListener('dragover', onDragover)
    nodeRefDom.value.addEventListener('dragleave', onDragleave)
    nodeRefDom.value.addEventListener('dragend', onDragend)
    nodeRefDom.value.addEventListener('drop', onDrop)
    nodeRefDom.value.addEventListener('contextmenu', e => {
      e.stopPropagation()
      e.preventDefault()
      onContextmenu(e, customClassName)
    })
    nodeRefDom.value.addEventListener('click', e => {
      e.stopPropagation()
      onClick(e, customClassName)
    })

  })

  type && onUnmounted(() => {
    nodeRefDom.value.setAttribute('draggable', false)

    nodeRefDom.value.removeEventListener('dragstart', onDragstart)
    nodeRefDom.value.removeEventListener('dragenter', onDragenter)
    nodeRefDom.value.removeEventListener('dragover', onDragover)
    nodeRefDom.value.removeEventListener('dragleave', onDragleave)
    nodeRefDom.value.removeEventListener('dragend', onDragend)
    nodeRefDom.value.removeEventListener('drop', onDrop)
    nodeRefDom.value.removeEventListener('contextmenu', e => {
      e.stopPropagation()
      e.preventDefault()
      onContextmenu(e, customClassName)
    })
    nodeRefDom.value.removeEventListener('click', e => {
      e.stopPropagation()
      onClick(e, customClassName)
    })

  })

  return {
    execBoth,
    onDocumentVisibilitychange: e => pressKeys.value.clear(),
    onWindowKeydown: e => pressKeys.value.add(e.key),
    onWindowKeyup: e => pressKeys.value.delete(e.key),
    onWindowResize: e => {
      emitter.emit('resize:window')
      closeContextmenu()
    },
    onWindowClick: useDebounceFn(e => execBoth(), 150),
    onWindowContextmenu: e => execBoth(),
    onDragstart,
    onDragenter,
    onDragover,
    onDragleave,
    onDragend,
    onDrop,
    onClick,
    onContextmenu
  }
}