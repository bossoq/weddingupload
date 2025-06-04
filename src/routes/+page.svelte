<script lang="ts">
  import { fade, slide } from 'svelte/transition';

  let progress: number = $state(0);
  let uploading: boolean = $state(false);
  let files: FileWithProgress[] = $state([]);

  const generateFileName = (name: string): string => {
    const timestamp = Date.now();
    const randomString = (Math.random() + 1).toString(36).substring(2);
    return `${timestamp}-${randomString}-${name}`;
  };

  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      files = Array.from(input.files).map((file) => ({
        name: generateFileName(file.name),
        originalFileName: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        preview: URL.createObjectURL(file),
        file
      }));
      progress = 0;
      uploading = true;
      handleUpload();
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    uploading = true;
    const totalFiles = files.length;

    for (const file of files) {
      const response = await fetch('/getPresignedUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          originalFileName: file.originalFileName
        })
      });
      if (!response.ok) {
        console.error('Failed to get presigned URL:', response.statusText);
        uploading = false;
        return;
      }
      const { location }: { location: string } = await response.json();
      const uploadResponse = await fetch(location, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file.file
      });
      if (!uploadResponse.ok) {
        console.error('Failed to upload file:', uploadResponse.statusText);
        uploading = false;
        return;
      }
      file.progress = 100; // Mark as complete
      progress = Math.round(((files.indexOf(file) + 1) / totalFiles) * 100); // Update overall progress
    }
    // for (let i = 0; i < files.length; i++) {
    //   const file = files[i];
    //   // Simulate upload progress
    //   for (let j = 0; j <= 100; j += 10) {
    //     await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay
    //     file.progress = j;
    //     progress = Math.round(((i + j / 100) / totalFiles) * 100); // Update overall progress
    //   }
    //   file.progress = 100; // Mark as complete
    // }

    setTimeout(() => {
      uploading = false;
    }, 5000);
  };
</script>

{#snippet imagePreview(file: FileWithProgress)}
  <div class="relative flex aspect-square items-center justify-center overflow-hidden">
    {#if file.progress < 100}
      <div class="absolute z-20 w-18">
        <svg class="size-full -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <!-- Background Circle -->
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            class="stroke-current text-gray-200"
            stroke-width="2"
          ></circle>
          <!-- Progress Circle -->
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            class="text-dark-brown stroke-current"
            stroke-width="2"
            stroke-dasharray="100"
            stroke-dashoffset="calc(100 - {file.progress})"
            stroke-linecap="round"
          ></circle>
        </svg>
        <!-- Percentage Text -->
        <div class="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <span class="text-dark-brown text-center text-2xl font-bold">{file.progress}%</span>
        </div>
      </div>
      <div class="absolute h-full w-full bg-gray-200 opacity-60"></div>
    {/if}
    <img src={file.preview} alt={file.name} class="aspect-square w-full rounded-md object-cover" />
  </div>
{/snippet}

<div class="flex items-center justify-center">
  <div class="m-4 w-full max-w-2xl rounded-xl bg-white shadow-lg">
    <form class="px-9 py-4">
      <div class="mb-6 pt-4">
        <span class="text-dark-brown mb-5 block text-center text-xl font-bold select-none">
          Upload Image for Mook Korn Wedding
        </span>

        {#if uploading}
          <div class="mb-4 select-none" transition:slide={{ duration: 300 }}>
            <div
              class="flex h-8 w-full overflow-hidden rounded-lg bg-gray-200"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="bg-dark-brown flex flex-col justify-center overflow-hidden rounded-lg text-center text-sm whitespace-nowrap text-white transition duration-500"
                style="width: {progress}%"
              >
                {#if progress < 100}
                  <span class="px-2">{progress}%</span>
                {:else}
                  <span class="px-2">Upload Complete</span>
                {/if}
              </div>
            </div>
          </div>
        {:else}
          <div class="mb-4 select-none" transition:slide={{ duration: 300 }}>
            <input
              type="file"
              name="file"
              id="file"
              class="sr-only"
              accept="image/*"
              multiple
              onchange={handleFileChange}
            />
            <label
              for="file"
              class="border-gray relative flex min-h-[160px] items-center justify-center rounded-md border border-dashed p-12 text-center"
            >
              <div>
                <span class="text-dark-brown mb-2 block text-xl font-semibold">
                  Drop images here
                </span>
                <span class="text-dark-brown mb-2 block text-base font-medium"> or </span>
                <span
                  class="text-dark-brown border-gray inline-flex rounded border px-7 py-2 text-base font-medium"
                >
                  Browse
                </span>
              </div>
            </label>
          </div>
        {/if}
      </div>

      {#if files.length > 0}
        <div
          class="bg-light-gray mb-4 grid w-full grid-cols-3 gap-4 rounded-md"
          transition:fade={{ duration: 300 }}
        >
          {#each files as file (file.name)}
            {@render imagePreview(file)}
          {/each}
        </div>
      {/if}
    </form>
  </div>
</div>
