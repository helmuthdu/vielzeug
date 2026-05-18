---
title: Looking Up Components
description: Discover and inspect Buildit web component declarations.
---

## Buildit component lookup

### Discover tags

List all available Buildit component tags:

```json
{ "name": "list-components", "arguments": {} }
```

### Read one component declaration

Get detailed information about a specific component:

```json
{ "name": "get-component", "arguments": { "tagName": "bit-button" } }
```

This returns the component's API, properties, slots, and usage examples.

