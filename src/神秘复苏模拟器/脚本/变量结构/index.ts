import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource@0.3.446/dist/util/mvu_zod.js';
import { z } from 'zod';
import { Schema } from '../../schema';
import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('变量结构');

$(() => {
  registerMvuSchema(Schema);
});
