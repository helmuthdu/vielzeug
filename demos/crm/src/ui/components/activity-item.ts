import { define, html, prop } from '@vielzeug/ore';

define<{ actor: string; description: string; time: string }>('crm-activity-item', {
  props: { actor: prop.string(''), description: prop.string(''), time: prop.string('') },
  setup(props) {
    return html`
      <span class="activity-item__avatar" aria-hidden="true">
        ${() =>
          props.actor.value
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
      </span>
      <span class="activity-item__copy">
        <strong>${() => props.actor.value}</strong>
        ${() => props.description.value}
      </span>
      <time>${() => props.time.value}</time>
    `;
  },
  shadow: false,
});
