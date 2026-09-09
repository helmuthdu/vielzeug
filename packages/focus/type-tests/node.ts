import {
  captureFocus,
  createListNavigation,
  type ListKeyResult,
  type ListNavigationChange,
  restoreFocus,
} from '@vielzeug/focus';

const navigation = createListNavigation({ getItems: () => ['first', 'second'] });
const result: ListKeyResult<string> | null = navigation.handleKeydown(new KeyboardEvent('keydown'));
const change: ListNavigationChange<string> | null = navigation.navigate('next');

void captureFocus;
void change;
void restoreFocus;
void result;
