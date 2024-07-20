<script lang="ts">
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
		password: string;
	} | null>(null);
	const showRenderedHtml = writable<boolean>(true);

	const languages = [
		{ code: 'de', name: 'German' },
		{ code: 'es', name: 'Spanish' },
		{ code: 'fr', name: 'French' },
		{ code: 'it', name: 'Italian' },
		{ code: 'ar', name: 'Arabic' },
		{ code: 'ht', name: 'Creole' }
		// Add more languages as needed
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading.set(true);

		const formData = new FormData(event.target as HTMLFormElement);
		const payload = {
			articleId: formData.get('articleId') as string,
			targetLanguage: formData.get('targetLanguage') as string,
			htmlContent: formData.get('htmlContent') as string,
			password: formData.get('password') as string, // Include password in the payload
			lastUpdated: new Date().toISOString() // Current timestamp
		};

		try {
			const response = await fetch('https://tnh-translation.vercel.app/api/translate-google', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch translation');
			}

			const data = await response.json();
			console.log('Response data:', data); // Log response data for debugging
			translatedHtml.set(data.translation);
			translationSource.set(data.source);
			requestData.set(data.requestData);
			errorMessage.set(null);
		} catch (error) {
			console.error('Error:', error.message); // Log the error to console
			errorMessage.set(error.message);
		} finally {
			isLoading.set(false);
		}
	}
</script>

<div>
	<div class="grey box">
		<h1 class="font-bold text-3xl mb-1">Translate HTML Content</h1>
		<h2>Using the Google Cloud Translation API</h2>
	</div>
	<form on:submit={handleSubmit} class="mb-5 space-y-4">
		<div>
			<label for="articleId" class="block font-medium">Article ID:</label>
			<input type="text" id="articleId" name="articleId" required class="mt-1 p-2 border w-full" />
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
			<label for="htmlContent" class="block font-medium">HTML Content:</label>
			<textarea id="htmlContent" name="htmlContent" required class="mt-1 p-2 border w-full"
			></textarea>
		</div>
		<div>
			<label for="password" class="block font-medium">Password:</label>
			<input
				type="password"
				id="password"
				name="password"
				required
				class="mt-1 p-2 border w-full"
			/>
		</div>
		<button type="submit">Translate</button>
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
		<div class="mb-4">
			<button
				on:click={() => showRenderedHtml.update((v) => !v)}
				class="bg-gray-500 text-white"
			>
				{#if $showRenderedHtml}
					Show HTML
				{/if}
				{#if !$showRenderedHtml}
					Show Rendered
				{/if}
			</button>
			<button
				on:click={() => navigator.clipboard.writeText($translatedHtml)}
				class="bg-green-500 text-white"
			>
				Copy HTML
			</button>
		</div>
		<div class="grey box">
			{#if $showRenderedHtml}
				{@html $translatedHtml}
			{/if}
			{#if !$showRenderedHtml}
				<pre>{$translatedHtml}</pre>
			{/if}
		</div>
		<div>
			{#if $requestData}
				<div class="grey box mono">
					<h2 class="font-bold">Request Information</h2>
					<p>Translation source: {$translationSource}</p>
					<hr />
					<p><strong>Original Language:</strong> {$requestData.srcLanguage}</p>
					<p><strong>Target Language:</strong> {$requestData.targetLanguage}</p>
					<hr />
					<p><strong>Original String:</strong></p>
					<p>{$requestData.htmlContent}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
