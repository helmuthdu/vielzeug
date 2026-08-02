/**
 * Internal all-components entry used by the standalone bundle and docs theme.
 *
 * Applications register components through explicit subpaths; the IIFE bundle
 * is the intentional all-components distribution for script-tag consumers.
 */
import * as content from './content';
import * as disclosure from './disclosure';
import * as feedback from './feedback';
import * as inputs from './inputs';
import * as layout from './layout';
import * as overlay from './overlay';

// Exporting the namespaces makes every registration module part of the standalone bundle.
export const components = { content, disclosure, feedback, inputs, layout, overlay };
