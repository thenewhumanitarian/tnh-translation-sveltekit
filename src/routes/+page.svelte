<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const translatedHtml = writable<string | null>(null);
	const errorMessage = writable<string | null>(null);
	const translationSource = writable<string | null>(null);
	const isLoading = writable<boolean>(false);
	const requestData = writable<{
		articleId: string;
		srcLanguage: string;
		targetLanguage: string;
		htmlContent: string;
		gptModel: string;
	} | null>(null);

	const languages = [
		{ code: 'en', name: 'English' },
		{ code: 'es', name: 'Spanish' },
		{ code: 'fr', name: 'French' },
		{ code: 'de', name: 'German' },
		{ code: 'it', name: 'Italian' },
		{ code: 'ar', name: 'Arabic' },
		{ code: 'ht', name: 'Creole' }
		// Add more languages as needed
	];

	const gptModels = [
		{ code: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
		{ code: 'gpt-4', name: 'GPT-4' }
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading.set(true);

		const formData = new FormData(event.target as HTMLFormElement);
		const payload = {
			articleId: formData.get('articleId') as string,
			srcLanguage: formData.get('srcLanguage') as string,
			targetLanguage: formData.get('targetLanguage') as string,
			htmlContent: formData.get('htmlContent') as string,
			gptModel: formData.get('gptModel') as string
		};

		try {
			const response = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				throw new Error('Failed to fetch translation');
			}

			const data = await response.json();
			console.log('Response data:', data); // Log response data for debugging
			translatedHtml.set(data.translation);
			translationSource.set(data.source);
			requestData.set(data.requestData);
			errorMessage.set(null);
		} catch (error) {
			errorMessage.set(error.message);
		} finally {
			isLoading.set(false);
		}
	}
</script>

<main class="p-5">
	<h1 class="font-bold text-3xl mb-5">Translation Page</h1>
	<form on:submit={handleSubmit} class="mb-5 space-y-4">
		<div>
			<label for="articleId" class="block font-medium">Article ID:</label>
			<input type="text" id="articleId" name="articleId" required class="mt-1 p-2 border w-full" />
		</div>
		<div>
			<label for="srcLanguage" class="block font-medium">Source Language:</label>
			<select id="srcLanguage" name="srcLanguage" required class="mt-1 p-2 border w-full">
				{#each languages as { code, name }}
					<option value={code}>{name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="targetLanguage" class="block font-medium">Target Language:</label>
			<select id="targetLanguage" name="targetLanguage" required class="mt-1 p-2 border w-full">
				{#each languages as { code, name }}
					<option value={code}>{name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="gptModel" class="block font-medium">GPT Model:</label>
			<select id="gptModel" name="gptModel" required class="mt-1 p-2 border w-full">
				{#each gptModels as { code, name }}
					<option value={code}>{name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="htmlContent" class="block font-medium">String to Translate:</label>
			<textarea id="htmlContent" name="htmlContent" required class="mt-1 p-2 border w-full"
			></textarea>
		</div>
		<button type="submit" class="p-2 bg-blue-500 text-white">Translate</button>
	</form>

	{#if $errorMessage}
		<div class="error box mono">
			<p>{$errorMessage}</p>
		</div>
	{/if}

	{#if $isLoading}
		<p>Loading...</p>
	{/if}

	{#if $translatedHtml}
		<div class="p-4 border mb-4">
			{@html $translatedHtml}
		</div>
		{#if $requestData}
			<div class="grey box mono">
				<h2 class="font-bold text-xl">Request Information</h2>
				<p>Translation source: {$translationSource}</p>
				<hr />
				<p><strong>Original Language:</strong> {$requestData.srcLanguage}</p>
				<p><strong>Target Language:</strong> {$requestData.targetLanguage}</p>
				<p><strong>GPT Model:</strong> {$requestData.gptModel}</p>
				<hr />
				<p><strong>Original String:</strong></p>
				<p>{@html $requestData.htmlContent}</p>
			</div>
		{/if}
	{/if}
</main>
