---
title: Looking Up Components
description: Discover and inspect Block web component declarations.
---

## Block component lookup

### Discover tags

List all available Block component tags:

```json
{ "name": "list-components", "arguments": {} }
```

### Read one component declaration

Get detailed information about a specific component:

```json
{ "name": "get-component", "arguments": { "tagName": "bit-button" } }
```

This returns the component's API, properties, slots, and usage examples.

