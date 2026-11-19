import { Router } from 'express';
import * as ctrl from '../controllers/conversations.controller.js';
import { validate, schemas } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const conversationsRouter = Router();

conversationsRouter.get('/', validate(schemas.listQuery, 'query'), asyncHandler(ctrl.list));
conversationsRouter.post('/', validate(schemas.createBody), asyncHandler(ctrl.create));
conversationsRouter.get('/:id', validate(schemas.idParams, 'params'), asyncHandler(ctrl.getOne));
conversationsRouter.patch('/:id', validate(schemas.idParams, 'params'), validate(schemas.renameBody), asyncHandler(ctrl.rename));
conversationsRouter.delete('/:id', validate(schemas.idParams, 'params'), asyncHandler(ctrl.remove));
