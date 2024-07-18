<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const translatedHtml = writable<string | null>(null);
	const errorMessage = writable<string | null>(null);
	const translationSource = writable<string | null>(null);
	const requestData = writable<{
		articleId: string;
		srcLanguage: string;
		targetLanguage: string;
		htmlContent: string;
	} | null>(null);

	onMount(async () => {
		const requestPayload = {
			articleId: '123',
			srcLanguage: 'en',
			targetLanguage: 'es',
			htmlContent: '<p>Hello, world!</p>'
		};

		try {
			const response = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestPayload)
			});

			if (!response.ok) {
				throw new Error('Failed to fetch translation');
			}

			const data = await response.json();
			translatedHtml.set(data.translation);
			translationSource.set(data.source);
			requestData.set(requestPayload);
		} catch (error) {
			errorMessage.set(error.message);
		}
	});
</script>

<main class="p-5">
	<h1 class="font-bold text-3xl mb-5">Translation Test Page</h1>
	{#if $errorMessage}
		<p class="error text-red-500">{$errorMessage}</p>
	{/if}
	{#if $translatedHtml}
		<div class="p-4 border mb-4">
			<p class="text-lime-700 font-bold">{$translatedHtml}</p>
		</div>
		<div class="grey box mono">
			<h2 class="text-lg font-bold pb-2">Request Information</h2>
			<p>Translation source: {$translationSource}</p>
			<hr />
			<p class="font-bold">Original Language: {$requestData.srcLanguage}</p>
			<p class="font-bold">Target Language: {$requestData.targetLanguage}</p>
			<hr />
			<p class="font-bold mb-2">Original String:</p>
			<p class="font-sans">
				{$requestData.htmlContent}
			</p>
		</div>
	{/if}
</main>

<style>
	.error {
		color: red;
	}
	.box {
		border: 1px solid #ccc;
		padding: 1em;
		margin-top: 1em;
	}
	.mono {
		font-family: monospace;
	}
	.grey {
		background-color: #f9f9f9;
	}
</style>
