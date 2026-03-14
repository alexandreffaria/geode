<script>
  /**
   * Reusable Input Component with Label
   * @component
   * 
   * @prop {string} type - Input type (text, number, date, etc.)
   * @prop {string|number} value - Input value (use with bind:value)
   * @prop {string} placeholder - Placeholder text
   * @prop {string} id - Input ID for label association
   * @prop {number} step - Step value for number inputs
   * @prop {boolean} disabled - Whether the input is disabled
   * 
   * @example
   * <Input
   *   type="text"
   *   bind:value={myValue}
   *   placeholder="Enter text"
   *   id="my-input"
   * />
   */
  
  /** @type {string} */
  export let type = 'text';
  
  /** @type {string | number} */
  export let value = '';
  
  /** @type {string} */
  export let placeholder = '';
  
  /** @type {string | undefined} */
  export let id = undefined;
  
  /** @type {number | undefined} */
  export let step = undefined;
  
  /** @type {boolean} */
  export let disabled = false;
  
  // Handle input event to update value
  function handleInput(event) {
    value = event.target.value;
  }
</script>

<input
  {id}
  type={type}
  {placeholder}
  {step}
  {disabled}
  value={value}
  on:input={handleInput}
  on:input
  on:change
  on:focus
  on:blur
  on:keydown
  on:keyup
  on:keypress
/>

<style>
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

  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input::placeholder {
    color: #666;
  }
</style>
