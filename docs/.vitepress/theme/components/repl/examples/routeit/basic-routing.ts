export const basicRoutingExample = {
  code: "import { createRouter } from '@vielzeug/routeit'\n\nconst router = createRouter({\n  routes: {\n    home: {\n      path: '/',\n      handler: () => console.log('Home page')\n    },\n    about: {\n      path: '/about',\n      handler: () => console.log('About page')\n    },\n    userDetail: {\n      path: '/users/:id',\n      handler: ({ params }) => console.log('User page - ID:', params.id)\n    },\n    notFound: {\n      path: '*',\n      handler: () => console.log('Not found')\n    }\n  }\n})\n\n\nconsole.log('Navigate to about')\nawait router.navigate({ name: 'about' })\n\nconsole.log('Navigate to user 123')\nawait router.navigate({ name: 'userDetail', params: { id: '123' } })",
  name: 'Basic Routing - Route Table',
};
