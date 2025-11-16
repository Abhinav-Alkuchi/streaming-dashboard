import { Router } from 'express';
import databricksRoutes from './databricksRoutes.js';
import abandonedCartRoutes from './abandonedCartRoutes.js';
import chatBotRoutes from './chatBotRoutes.js';
// import chatBotLocalRoutes from "./chatBotLocalRoutes.js"
import storeModeRoutes from './storeModeRoutes.js';
import stagRequestRoutes  from './stagRequestRoutes.js'

const router = Router();

router.use(databricksRoutes);
router.use(abandonedCartRoutes);
router.use(chatBotRoutes);
//router.use(chatBotLocalRoutes);
router.use(storeModeRoutes);
router.use(stagRequestRoutes);

export default router;