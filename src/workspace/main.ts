import { mount } from 'svelte';
import Workspace from './Workspace.svelte';

const app = mount(Workspace, {
    target: document.getElementById('app')!,
});

export default app;
