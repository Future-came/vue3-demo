const moduleMappings = import.meta.glob('@/lib/**/*.(jsx|vue)')

export const jsxModules = new Map()
export const vueModules = new Map()
export const shortcutTypes = new Map()

// 获取所有模块
const modules = await Promise.all(Object.values(moduleMappings).map((module) => module()))

// 根据模块路径处理模块及信息对象
Object.keys(moduleMappings).forEach((path, index) => {
  // 获取对应模块
  const module = modules[index]
  // 根据路径匹配模块名称及后缀名
  const [, moduleName, extName] = path.match(/^.+\/(\w+)\/index\.(jsx|vue)$/i)
  // 解构jsx模块中模块信息
  const {
    // jsx模块中文描述
    description,
    // jsx模块所属类型
    type,
    // jsx模块所属类型描述
    typeDesc
  } = module.default

  // 移除模块信息
  delete module.default.description
  delete module.default.type
  delete module.default.typeDesc

  // 更新模块存储对象
  ;((extName === 'jsx' && jsxModules) || vueModules).set(moduleName, module.default)
  // 更新模块信息存储对象
  extName === 'jsx' && shortcutTypes.set(moduleName, { description, type, typeDesc })
})

export default {
  jsxModules,
  vueModules,
  shortcutTypes
}
