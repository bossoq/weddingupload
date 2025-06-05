<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import { name as storeName } from '$lib/stores';
  import { fade, slide } from 'svelte/transition';

  let authorName: string = $state('');
  let nameEditing: boolean = $state(true);
  let progress: number = $state(0);
  let uploading: boolean = $state(false);
  let prevUploadedFiles: photos[] = $state([]);
  let files: FileWithProgress[] = $state([]);

  onMount(async () => {
    try {
      authorName = $storeName;
      if (authorName) {
        nameEditing = false; // If a name is already set, don't allow editing
      }
      prevUploadedFiles = (await db.photos.toArray()).reverse();
    } catch (error) {
      console.error('Failed to fetch previous uploaded files:', error);
    }
  });

  const generateFileName = (name: string): string => {
    const timestamp = Date.now();
    const randomString = (Math.random() + 1).toString(36).substring(2);
    return `${timestamp}-${authorName}-${randomString}-${name}`;
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
      if (files.length === 0) {
        alert('Please select image or video files.');
        return;
      }
      progress = 0;
      uploading = true;
      handleUpload();
    }
  };
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      files = Array.from(event.dataTransfer.files)
        .filter((file) => {
          return file.type.startsWith('image/') || file.type.startsWith('video/');
        })
        .map((file) => ({
          name: generateFileName(file.name),
          originalFileName: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          preview: URL.createObjectURL(file),
          file
        }));
      if (files.length === 0) {
        alert('Please drop only image or video files.');
        return;
      }
      progress = 0;
      uploading = true;
      handleUpload();
    }
  };
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy'; // Show copy cursor
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
          originalFileName: file.originalFileName,
          description: `Uploaded by ${authorName}`
        })
      });
      if (!response.ok) {
        console.error('Failed to get presigned URL:', response.statusText);
        uploading = false;
        return;
      }
      const { location }: { location: string } = await response.json();
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', location);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          file.progress = Math.round((event.loaded / event.total) * 100);
          progress = Math.round(((files.indexOf(file) + 1) / totalFiles) * 100);
        }
      };
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file.file);
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const { id } = JSON.parse(xhr.responseText);
          const response = await fetch(`/getThumbnail?fileId=${id}`);
          if (!response.ok) {
            console.error('Failed to get thumbnail:', response.statusText);
            uploading = false;
            return;
          }
          const thumbnail = await response.blob();
          db.photos.add({
            name: file.name,
            photoBlob: thumbnail
          });
          prevUploadedFiles = (await db.photos.toArray()).reverse();
          files = files.filter((f) => f.name !== file.name); // Remove uploaded file from the list
          console.log('File uploaded successfully');
        } else {
          console.error('Failed to upload file:', xhr.statusText);
          uploading = false;
        }
      };
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
{#snippet imageUploaded(file: photos)}
  <div class="relative flex aspect-square items-center justify-center overflow-hidden">
    <img
      src={URL.createObjectURL(file.photoBlob)}
      alt={file.name}
      class="aspect-square w-full rounded-md object-cover"
    />
  </div>
{/snippet}

<div class="flex items-center justify-center">
  <div class="m-4 w-full max-w-2xl rounded-xl bg-white shadow-lg">
    <form class="px-9 py-4">
      <div class="mb-6 pt-4">
        <span class="text-dark-brown mb-5 block text-center text-xl font-bold select-none">
          Upload Image or Video for Mook Korn Wedding
        </span>

        <div class="mb-4 flex flex-col items-center justify-center">
          <div class="flex w-full items-center justify-center gap-2">
            <input
              type="text"
              name="name"
              id="name"
              class="text-dark-brown focus:border-dark-brown focus:ring-dark-brown w-full rounded-md border border-gray-300 px-3 py-2 text-base font-medium focus:ring-1 focus:outline-none"
              placeholder="Pls put your name here"
              bind:value={authorName}
              disabled={!nameEditing}
              oninput={(e) => {
                authorName = (e.target as HTMLInputElement).value;
                $storeName = authorName; // Update the store with the new name
              }}
              required
            />
            {#if nameEditing}
              <button
                class="bg-dark-brown hover:bg-dark-brown/80 rounded-md px-4 py-2 text-white"
                onclick={(e) => {
                  e.preventDefault();
                  nameEditing = !nameEditing;
                }}
              >
                Confirm
              </button>
            {:else}
              <button
                class="bg-dark-brown hover:bg-dark-brown/80 rounded-md px-4 py-2 text-white"
                onclick={() => {
                  nameEditing = !nameEditing;
                }}
              >
                Edit
              </button>
            {/if}
          </div>
          {#if nameEditing}
            <span
              class="text-dark-brown mt-2 block text-sm font-medium"
              transition:slide={{ duration: 300 }}
            >
              Please put your name here so we know who shared these images.
              <!-- or continue as <button
                class="cursor-pointer font-bold"
                onclick={() => {
                  authorName = 'Anonymous';
                  $storeName = authorName; // Update the store with the new name
                  nameEditing = false;
                }}>Anonymous</button
              > -->
            </span>
          {/if}
        </div>
        {#if !nameEditing}
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
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="mb-4 select-none"
              ondrop={handleDrop}
              ondragover={handleDragOver}
              transition:slide={{ duration: 300 }}
            >
              <input
                type="file"
                name="file"
                id="file"
                class="sr-only"
                accept="image/*,video/*"
                multiple
                onchange={handleFileChange}
              />
              <label
                for="file"
                class="border-gray relative flex min-h-[160px] items-center justify-center rounded-md border border-dashed p-12 text-center"
              >
                <div>
                  <span class="text-dark-brown mb-2 block text-xl font-semibold">
                    Drop images or videos here
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
        {/if}
      </div>

      {#if files.length > 0 || prevUploadedFiles.length > 0}
        <div
          class="bg-light-gray mb-4 grid w-full grid-cols-3 gap-4 rounded-md"
          transition:fade={{ duration: 300 }}
        >
          {#each files as file (file.name)}
            {@render imagePreview(file)}
          {/each}
          {#each prevUploadedFiles as file (file.id)}
            {@render imageUploaded(file)}
          {/each}
        </div>
      {/if}
    </form>
  </div>
</div>
