import fixtures from '../../../../packages/refine/src/icons/__tests__/fixtures/iconify.json';

/** Local, licensed samples only; full icon collections never enter the preview bundle. */
export function iconLibraryPreviewHtml(): string {
  const data = JSON.stringify(fixtures).replace(/</g, '\\u003c');
  return `<ore-stack gap="lg">
  <ore-stack direction="horizontal" gap="lg">
    <span><ore-icon name="hero-home" label="Heroicons home" size="24"></ore-icon> Heroicons · outline</span>
    <span><ore-icon name="tabler-home" label="Tabler home" size="24"></ore-icon> Tabler · outline</span>
    <span><ore-icon name="material-home" label="Material Design Icons home" size="24"></ore-icon> Material Design Icons · filled</span>
  </ore-stack>
  <span><ore-icon name="material-home" size="24"></ore-icon> Decorative icon with visible text</span>
  <ore-button><ore-icon name="check" slot="prefix"></ore-icon> Internal check overridden with MDI home</ore-button>
</ore-stack>
<script type="module">
const { registerIcons, heroiconsIcons, tablerIcons, mdiIcons } = window.Refine.components.content;
const samples = ${data};
const home = (collection) => ({ ...collection.icons.home, width: collection.width, height: collection.height });
registerIcons({
  ...heroiconsIcons({ HeroHome: home(samples.heroicons) }),
  ...tablerIcons({ TablerHome: home(samples.tabler) }),
  ...mdiIcons({ MaterialHome: home(samples.mdi), Check: home(samples.mdi) }),
});
// The sandbox upgrades markup before module scripts execute; refresh existing names.
document.querySelectorAll('ore-icon').forEach((element) => {
  const name = element.getAttribute('name');
  element.removeAttribute('name');
  element.setAttribute('name', name);
});
</script>`;
}
