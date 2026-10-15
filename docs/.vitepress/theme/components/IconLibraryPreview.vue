<script lang="ts">
import { defineComponent, h } from 'vue';

import ComponentPreview from './ComponentPreview.vue';
import { iconLibraryPreviewHtml } from './icon-library-preview';

export default defineComponent({
  setup() {
    const html = iconLibraryPreviewHtml();
    return () => h(ComponentPreview, { title: 'Local Iconify data: three libraries', vertical: true }, {
      default: () => [h('div', { class: 'language-html' }, [h('pre', [h('code', html)])])],
    });
  },
});
</script>
