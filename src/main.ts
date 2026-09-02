import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.min.css';
import './assets/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
