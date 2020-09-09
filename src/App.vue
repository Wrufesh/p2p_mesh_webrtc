<template>
  <div id="app">
    <div id="nav">
      <h3>P2P WebRTC <span>MESH</span> Room POC</h3>
    </div>
    <router-view />
  </div>
</template>

<script>
// import { provideStore } from "./composables/use-store";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    document.title = "P2P WebRTC MESH";
  }
});
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding-top: 30px;
  padding-bottom: 15px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
