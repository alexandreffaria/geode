<script>
  /**
   * Reusable Button Component
   * @component
   * 
   * @prop {string} variant - Button style variant: 'primary', 'secondary', or 'danger'
   * @prop {string} type - Button type: 'button' or 'submit'
   * @prop {boolean} disabled - Whether the button is disabled
   * 
   * @event click - Forwarded from native button element
   * 
   * @example
   * <Button variant="primary" on:click={handleClick}>
   *   Save
   * </Button>
   */
  
  /** @type {'primary' | 'secondary' | 'danger'} */
  export let variant = 'primary';
  
  /** @type {'button' | 'submit'} */
  export let type = 'button';
  
  /** @type {boolean} */
  export let disabled = false;
</script>

<button
  class="btn btn-{variant}"
  {type}
  {disabled}
  on:click
>
  <slot />
</button>

<style>
  .btn {
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
    font-size: 1rem;
    font-family: inherit;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #a882ff;
    color: #111;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #b795ff;
  }

  .btn-secondary {
    background-color: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #333;
  }

  .btn-danger {
    background-color: #dc2626;
    color: #fff;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #ef4444;
  }
</style>
