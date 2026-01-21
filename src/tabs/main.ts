import { mount } from 'svelte';
import Tabs from './Tabs.svelte';

const app = mount(Tabs, {
    target: document.getElementById('app')!,
});

export default app;
