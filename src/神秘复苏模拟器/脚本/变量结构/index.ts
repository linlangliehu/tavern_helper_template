import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { z } from 'zod';
import { Schema } from '../../schema';

$(() => {
  registerMvuSchema(Schema);
});