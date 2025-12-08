<script lang="ts">
  // This file should NOT trigger ESLint errors - using type-only imports
  import type { Logger } from 'pino';

  const logger: Logger | null = null;
</script>

<h1>Good Example - Type-only imports are allowed</h1>
<p>Logger type: {logger ? 'defined' : 'null'}</p>



