import { mount } from 'svelte';
import Popup from './Popup.svelte';

const intentionalFailure: string = 123;

const app = mount(Popup, {
    target: document.getElementById('app')!,
});

export default app;
