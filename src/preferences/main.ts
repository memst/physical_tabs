import { mount } from "svelte";
import Preferences from "./Preferences.svelte";

const app = mount(Preferences, {
    target: document.getElementById("app")!,
});

export default app;
