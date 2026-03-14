<script>
  import { createEventDispatcher, onMount } from 'svelte';

  /**
   * Modal Backdrop Component
   * @component
   * 
   * Provides a reusable modal backdrop with:
   * - Click outside to close
   * - Escape key to close
   * - Backdrop blur effect
   * 
   * @prop {boolean} show - Whether to show the modal
   * 
   * @event close - Emitted when backdrop is clicked or Escape is pressed
   * 
   * @example
   * <ModalBackdrop show={showModal} on:close={handleClose}>
   *   <div class="modal">
   *     Modal content here
   *   </div>
   * </ModalBackdrop>
   */
  
  const dispatch = createEventDispatcher();
  
  /** @type {boolean} */
  export let show = true;
  
  /**
   * Handle backdrop click (click outside modal content)
   * @param {MouseEvent} event
   */
  function handleBackdropClick(event) {
    // Only close if clicking the backdrop itself, not its children
    if (event.target === event.currentTarget) {
      dispatch('close');
    }
  }
  
  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
  
  // Add keyboard listener when component mounts
  onMount(() => {
    const handleGlobalKeydown = (event) => {
      if (show && event.key === 'Escape') {
        dispatch('close');
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });
</script>

{#if show}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
  >
    <slot />
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }

  /* Prevent body scroll when modal is open */
  :global(body:has(.modal-backdrop)) {
    overflow: hidden;
  }
</style>
