<template>
  <svg
    :aria-labelledby="iconName"
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="viewBoxValue"
    role="presentation"
  >
    <title :id="iconName" lang="en">{{ iconName }}</title>
    <g :fill="iconColor" v-html="path" />
  </svg>
</template>
<script lang="ts">

import { defineComponent } from "vue";

export default defineComponent({
  props: {
    iconName: {
      type: String,
      default: ''
    },
    iconColor: {
      type: String,
      default: 'currentColor'
    },
    path: {
      type: String,
      default: ''
    },
    viewBoxValue: {
      type: String,
      default: '0,0,24,24'
    }
  }
})
</script>
