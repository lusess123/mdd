/** 一个应用/会话独享；表单卸载注销，异步确认期间拒绝重复切换。 */
export function createChangeGuard() {
  const dirty = new Set<string>();
  let pending = false;
  return {
    setDirty({ id, value }: { id: string; value: boolean }) {
      value ? dirty.add(id) : dirty.delete(id);
    },
    hasChanges() {
      return dirty.size > 0;
    },
    async request({
      confirm,
      commit,
    }: {
      confirm: () => Promise<boolean>;
      commit: () => void | Promise<void>;
    }) {
      if (pending) return false;
      pending = true;
      try {
        if (dirty.size && !(await confirm())) return false;
        await commit();
        return true;
      } finally {
        pending = false;
      }
    },
  };
}
