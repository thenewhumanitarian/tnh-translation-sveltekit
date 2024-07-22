<script>
	import '../app.css';
</script>

<header class="p-5 bg-zinc-900 text-white">
	<h1 class="text-3xl font-bold tracking-tight">Translation interface by The New Humanitarian</h1>
</header>

<nav class="flex gap-5 p-5 pb-1">
	<a href="/translate-google"><button>Translate with Google</button></a>
	<a href="/translate-gpt"><button>Translate with ChatGPT</button></a>
	<a href="/translate-deepl"><button>Translate with DeepL</button></a>
</nav>

<main class="p-5">
	<slot />
</main>
