<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div class="toast-container">
        <div
          v-for="(item, index) in list"
          :key="item.id"
          class="toast-item"
          :class="item.type"
        >
          <span class="toast-icon">
            {{ item.type === 'success' ? '✓' : item.type === 'warn' ? '!' : 'i' }}
          </span>
          <span class="toast-text">{{ item.message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const list = ref([])
let seed = 0

function show(message, type = 'success', duration = 2000) {
  const id = ++seed
  list.value.push({ id, message, type })
  setTimeout(() => {
    list.value = list.value.filter(x => x.id !== id)
  }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  min-width: 220px;
  max-width: 320px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(13, 28, 51, 0.92);
  border: 1px solid #27416b;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #d0e4ff;
  font-size: 13px;
  animation: toast-in 0.25s ease;
}

.toast-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-item.success .toast-icon {
  background: rgba(79, 195, 247, 0.25);
  color: #4fc3f7;
  border: 1px solid #4fc3f7;
}

.toast-item.warn .toast-icon {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  border: 1px solid #ffb74d;
}

.toast-text {
  flex: 1;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>