---
id: Truncate
section: components
propComponents: [Truncate]
beta: true
---

## Examples

### End
```js
import React from 'react';
import { Truncate } from '@patternfly/react-core';

<div style={{ width: '200px' }}>
  <Truncate
    content={'The quick brown fox jumps over the lazy dog'}
    position={'end'}
  />
</div>
```

### Start
```js
import React from 'react';
import { Truncate } from '@patternfly/react-core';

<div style={{ width: '200px' }}>
  <Truncate
    content={'The quick brown fox jumps over the lazy dog'}
    position={'start'}
  />
</div>
```

### Middle
```js
import React from 'react';
import { Truncate } from '@patternfly/react-core';

<div style={{ width: '200px' }}>
  <Truncate
    content={'The quick brown fox jumps over the lazy dog'}
    position={'middle'}
  />
</div>
```