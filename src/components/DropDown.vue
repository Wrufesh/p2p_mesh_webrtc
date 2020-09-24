<template>
  <div>
    <div class="toggle-button">
      <slot name="button" :handleToggle="toggleDropdownVisibility">
        <button>Button</button>
      </slot>

      <div v-if="state.dropdownVisible" class="menu-box">
        <slot name="content" :hideMenu="hideMenu">
          Menu Box Content
        </slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from "vue";
export default defineComponent({
  setup() {
    const state = reactive({
      dropdownVisible: false
    });

    const toggleDropdownVisibility = () => {
      state.dropdownVisible = !state.dropdownVisible;
    };

    const hideMenu = () => {
      state.dropdownVisible = false;
    };

    return {
      state,
      toggleDropdownVisibility,
      hideMenu
    };
  }
});
</script>

<style>
.dropdown {
  position: relative;
}
.toggle-button {
}
.menu-box {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  buttom: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(100, 98, 98, 0.308);
  box-shadow: 2px 2px 2px 2px rgb(201, 189, 189);
  padding: 3px;
}
</style>
