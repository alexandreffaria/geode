<script>
  /**
   * Autocomplete Input Component with Datalist
   * @component
   * 
   * @prop {string} value - Input value (use with bind:value)
   * @prop {string[]} options - Array of autocomplete options
   * @prop {string} placeholder - Placeholder text
   * @prop {string} id - Input ID for label association
   * @prop {string} label - Label text (optional, for standalone use)
   * 
   * @example
   * <AutocompleteInput
   *   bind:value={accountName}
   *   options={accountOptions}
   *   placeholder="e.g. PagBank"
   *   id="account-input"
   * />
   */
  
  /** @type {string} */
  export let value = '';
  
  /** @type {string[]} */
  export let options = [];
  
  /** @type {string} */
  export let placeholder = '';
  
  /** @type {string | undefined} */
  export let id = undefined;
  
  /** @type {string | undefined} */
  export let label = undefined;
  
  // Generate unique datalist ID
  const listId = id 
    ? `${id}-list` 
    : `list-${Math.random().toString(36).substr(2, 9)}`;
</script>

{#if label}
  <div class="input-wrapper">
    <label for={id}>{label}</label>
    <input
      {id}
      type="text"
      list={listId}
      {placeholder}
      bind:value
      autocomplete="off"
      on:input
      on:change
      on:focus
      on:blur
    />
    <datalist id={listId}>
      {#each options as option}
        <option value={option}></option>
      {/each}
    </datalist>
  </div>
{:else}
  <input
    {id}
    type="text"
    list={listId}
    {placeholder}
    bind:value
    autocomplete="off"
    on:input
    on:change
    on:focus
    on:blur
  />
  <datalist id={listId}>
    {#each options as option}
      <option value={option}></option>
    {/each}
  </datalist>
{/if}

<style>
  .input-wrapper {
    display: flex;
    flex-direction: column;
  }

  label {
    font-size: 0.8rem;
    color: #aaa;
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    font-weight: bold;
  }

  input {
    background: #111;
    border: 1px solid #333;
    color: white;
    padding: 10px;
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
    font-family: inherit;
  }

  input:focus {
    outline: none;
    border-color: #a882ff;
  }

  input::placeholder {
    color: #666;
  }
</style>
