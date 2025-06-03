<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="bg-light-beige h-screen w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth">
	<main class="scrollbar-hidden">
		{@render children()}
	</main>
</div>
