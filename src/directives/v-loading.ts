/*
* fixme
*  注意自定义指令的使用方式，需要真实DOM上使用,组件上使用没有效果,需要包裹真实DOM
*  如<div v-loading="true"><component/></div>
* */
import { createVNode, render } from 'vue';
import { Spin } from 'ant-design-vue';

interface SpinInstance {
  instance: HTMLElement | null;
}

const spinDirective = {
  mounted(el: HTMLElement, binding: { value: boolean }) {
    const spinContainer = document.createElement('div');
    spinContainer.style.position = 'absolute';
    spinContainer.style.top = '0';
    spinContainer.style.left = '0';
    spinContainer.style.width = '100%';
    spinContainer.style.height = '100%';
    spinContainer.style.display = 'flex';
    spinContainer.style.justifyContent = 'center';
    spinContainer.style.alignItems = 'center';
    spinContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    spinContainer.style.zIndex = '1000';

    const vnode = createVNode(Spin, {
      spinning: true,
      size: 'large',
    });

    render(vnode, spinContainer);

    const spinInstance: SpinInstance = {
      instance: null,
    };

    spinInstance.instance = spinContainer;

    el.style.position = 'relative';
    el.__spinInstance = spinInstance; // Attach spin instance to the element

    if (binding.value) {
      el.appendChild(spinContainer);
    }
  },
  updated(el: HTMLElement, binding: { value: boolean }) {
    const spinInstance = el.__spinInstance as SpinInstance;

    if (binding.value && !spinInstance.instance?.parentNode) {
      el.appendChild(spinInstance.instance!);
    } else if (!binding.value && spinInstance.instance?.parentNode) {
      el.removeChild(spinInstance.instance);
    }
  },
  unmounted(el: HTMLElement) {
    const spinInstance = el.__spinInstance as SpinInstance;
    if (spinInstance.instance?.parentNode) {
      el.removeChild(spinInstance.instance);
    }
    delete el.__spinInstance;
  },
};

export default spinDirective;
